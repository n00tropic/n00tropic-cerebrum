import argparse
import subprocess
import sys
import json
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional  # noqa: F401

# Constants
DEFAULT_COVERAGE_THRESHOLD = 75
MODULES_ROOT = Path("platform")


@dataclass
class TestResult:
    module: str
    passed: bool
    coverage: float
    message: str


def run_python_tests(module_path: Path) -> TestResult:
    """Run pytest with coverage for a Python module."""
    print(f"Running Python tests for {module_path.name}...")

    # Check if tests exist
    if not (module_path / "tests").exists():
        return TestResult(module_path.name, False, 0.0, "No tests directory found")

    try:
        # Run pytest with json report and coverage
        # Note: relying on pytest-cov being installed in the environment
        cmd = [
            sys.executable,
            "-m",
            "pytest",
            str(module_path),
            f"--cov={module_path}",
            "--cov-report=json:coverage.json",
            "--cov-fail-under=0",  # We handle threshold check manually
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=module_path,
        )

        # Check pass/fail
        passed = result.returncode == 0

        # Parse coverage
        coverage = 0.0
        cov_file = module_path / "coverage.json"
        if cov_file.exists():
            try:
                data = json.loads(cov_file.read_text())
                coverage = data.get("totals", {}).get("percent_covered", 0.0)
            except Exception:
                pass
            # Cleanup
            cov_file.unlink(missing_ok=True)

        return TestResult(
            module_path.name, passed, coverage, result.stdout if not passed else ""
        )

    except Exception as e:
        return TestResult(module_path.name, False, 0.0, str(e))


def run_node_tests(module_path: Path) -> TestResult:
    """Run vitest with coverage for a Node.js module."""
    print(f"Running Node.js tests for {module_path.name}...")

    if not (module_path / "package.json").exists():
        return TestResult(module_path.name, False, 0.0, "No package.json found")

    try:
        # Run npm test (expects script to enable coverage)
        # Using pnpm in this repo
        cmd = [
            "pnpm",
            "test",
            "--",
            "--coverage",
            "--reporter=json",
            "--outputFile=test-results.json",
        ]

        # We need to run this from the module dir
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=module_path,
        )
        passed = result.returncode == 0

        coverage = 0.0
        # Parse vitest json output if possible, or parsing stdout for text summary
        # Let's try parsing stdout for "All files | 80.5 |" style lines if complex parsing fails
        if "All files" in result.stdout:
            match = re.search(r"All files\s+\|\s+([\d\.]+)", result.stdout)
            if match:
                coverage = float(match.group(1))

        return TestResult(
            module_path.name, passed, coverage, result.stdout if not passed else ""
        )

    except Exception as e:
        return TestResult(module_path.name, False, 0.0, str(e))


def identify_type(module_path: Path) -> str:
    if (module_path / "pyproject.toml").exists() or (
        module_path / "requirements.txt"
    ).exists():
        return "python"
    if (module_path / "package.json").exists():
        return "node"
    return "unknown"


def main():
    parser = argparse.ArgumentParser(description="Run quality gates for MCP modules")
    parser.add_argument("--modules", nargs="+", help="Specific modules to test")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_COVERAGE_THRESHOLD,
        help="Coverage threshold %",
    )
    args = parser.parse_args()

    # Determine modules
    if args.modules:
        targets = [MODULES_ROOT / m for m in args.modules]
    else:
        # Auto-discover
        targets = [
            d
            for d in MODULES_ROOT.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ]

    print(
        f"Running quality gates for {len(targets)} modules (Threshold: {args.threshold}%)\n"
    )

    for target in targets:
        if not target.exists():
            print(f"Module {target} not found, skipping.")
            continue

        m_type = identify_type(target)
        res = None

        if m_type == "python":
            res = run_python_tests(target)
        elif m_type == "node":
            res = run_node_tests(target)
        else:
            print(f"Skipping {target.name} (unknown type)")
            continue

        if res:
            status = "PASS" if res.passed else "FAIL"
            cov_status = "PASS" if res.coverage >= args.threshold else "FAIL"

            print(f"[{status}] {res.module}")
            print(f"  Tests: {status}")
            print(f"  Coverage: {res.coverage:.2f}% ({cov_status})")

            if not res.passed or res.coverage < args.threshold:
                failed = True
                if res.message:
                    # pylint: disable=unsubscriptable-object
                    msg = str(res.message)
                    truncated_msg = f"{msg:.500}"
                    print(f"  Error:\n{truncated_msg}...")  # Truncate log

            print("-" * 40)

    if failed:
        sys.exit(1)
    else:
        print("All quality gates passed!")


if __name__ == "__main__":
    main()
