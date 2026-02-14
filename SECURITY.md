# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public issue
2. Email security concerns to: security@n00tropic.com
3. Include detailed information about the vulnerability
4. Allow 48 hours for initial response

## Supported Versions

| Version          | Supported |
| ---------------- | --------- |
| Latest main      | ✅        |
| Previous release | ✅        |
| Older releases   | ❌        |

## Security Measures

### Dependency Management

- Automated vulnerability scanning via OSV Scanner
- Renovate for automated dependency updates
- Weekly security audit in CI/CD

### Code Security

- Pre-commit hooks with secret detection (gitleaks)
- Static analysis with ruff/bandit (Python) and biome (TypeScript)
- Dependency review on all pull requests

### Build Security

- Reproducible builds where possible
- SBOM generation for releases
- Signed commits encouraged

## Security Best Practices

### For Contributors

1. Never commit secrets or credentials
2. Use pre-commit hooks before pushing
3. Keep dependencies updated
4. Follow secure coding guidelines

### For Maintainers

1. Review all dependency updates
2. Run security scans before releases
3. Respond to vulnerability reports within 48 hours
4. Document security-related changes

## Acknowledgments

We thank the security researchers who have helped improve the security of this project through responsible disclosure.
