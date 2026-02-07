# Script Duplicate Report

Generated on 2026-02-07. Run `node scripts/analyze-script-duplicates.mjs` to refresh.

Notes:

- Same basename across different paths is flagged.
- Excludes node_modules, .pnpm-store, dist/build/artifacts, and cache/temp directories.

Total scripts scanned: 361
Duplicate basenames: 36

## install-hooks.sh (20)

- subrepo: 19
  - .dev/automation/scripts/install-hooks.sh
  - platform/n00-cortex/.dev/n00-cortex/scripts/install-hooks.sh
  - platform/n00-cortex/scripts/install-hooks.sh
  - platform/n00-frontiers/.dev/n00-frontiers/scripts/install-hooks.sh
  - platform/n00-frontiers/scripts/install-hooks.sh
  - platform/n00-horizons/.dev/n00-horizons/scripts/install-hooks.sh
  - platform/n00-horizons/scripts/install-hooks.sh
  - platform/n00-school/.dev/n00-school/scripts/install-hooks.sh
  - platform/n00-school/scripts/install-hooks.sh
  - platform/n00clear-fusion/.dev/n00clear-fusion/scripts/install-hooks.sh
  - platform/n00clear-fusion/scripts/install-hooks.sh
  - platform/n00man/scripts/install-hooks.sh
  - platform/n00menon/scripts/install-hooks.sh
  - platform/n00plicate/.dev/n00plicate/scripts/install-hooks.sh
  - platform/n00plicate/scripts/install-hooks.sh
  - platform/n00t/.dev/n00t/scripts/install-hooks.sh
  - platform/n00t/scripts/install-hooks.sh
  - platform/n00tropic/.dev/n00tropic/scripts/install-hooks.sh
  - platform/n00tropic/scripts/install-hooks.sh
- root: 1
  - scripts/install-hooks.sh

## check-attrs.mjs (5)

- subrepo: 4
  - .dev/automation/scripts/check-attrs.mjs
  - platform/n00-cortex/scripts/check-attrs.mjs
  - platform/n00-frontiers/scripts/check-attrs.mjs
  - platform/n00t/scripts/check-attrs.mjs
- root: 1
  - scripts/check-attrs.mjs

## convert-md-to-adoc.sh (4)

- subrepo: 4
  - .dev/automation/scripts/convert-md-to-adoc.sh
  - platform/n00-cortex/scripts/convert-md-to-adoc.sh
  - platform/n00-frontiers/scripts/convert-md-to-adoc.sh
  - platform/n00t/scripts/convert-md-to-adoc.sh

## generate_from_template.py (4)

- tools: 4
  - platform/n00-frontiers/applications/scaffolder/templates/frontier-repo/{{cookiecutter.project_slug}}/tools/generate_from_template.py
  - platform/n00-frontiers/applications/scaffolder/templates/frontier-webapp/{{cookiecutter.project_slug}}/tools/generate_from_template.py
  - resources/frontier-repo-template/tools/generate_from_template.py
  - resources/frontier-webapp-template/tools/generate_from_template.py

## architecture-design.sh (3)

- subrepo: 2
  - .dev/automation/scripts/ai-workflows/architecture-design.sh
  - 1. Cerebrum Docs/Agent Assisted Development/scripts/architecture-design.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/architecture-design.sh

## skeleton-wrapper.sh (3)

- subrepo: 3
  - platform/n00-cortex/n00-cortex/.dev/n00-cortex/scripts/skeleton-wrapper.sh
  - platform/n00-cortex/n00t/.dev/n00t/scripts/skeleton-wrapper.sh
  - platform/n00t/.dev/n00t/scripts/skeleton-wrapper.sh

## sync-trunk.py (3)

- subrepo: 2
  - .dev/automation/scripts/sync-trunk.py
  - platform/n00-frontiers/.dev/scripts/sync-trunk.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/sync-trunk.py

## workspace-health-wrapper.sh (3)

- subrepo: 3
  - platform/n00-cortex/n00-cortex/.dev/n00-cortex/scripts/workspace-health-wrapper.sh
  - platform/n00-cortex/n00t/.dev/n00t/scripts/workspace-health-wrapper.sh
  - platform/n00t/.dev/n00t/scripts/workspace-health-wrapper.sh

## workspace-skeleton.sh (3)

- subrepo: 3
  - platform/n00-cortex/scripts/workspace-skeleton.sh
  - platform/n00-frontiers/scripts/workspace-skeleton.sh
  - platform/n00t/scripts/workspace-skeleton.sh

## ai-workflow-runner.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ai-workflows/ai-workflow-runner.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/ai-workflow-runner.sh

## bootstrap.sh (2)

- templates: 1
  - platform/n00-frontiers/applications/scaffolder/templates/frontier-repo/{{cookiecutter.project_slug}}/scripts/bootstrap.sh
- subrepo: 1
  - resources/frontier-repo-template/scripts/bootstrap.sh

## check-cross-repo-consistency.py (2)

- subrepo: 1
  - .dev/automation/scripts/check-cross-repo-consistency.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/check-cross-repo-consistency.py

## check-submodules.sh (2)

- subrepo: 1
  - .dev/automation/scripts/check-submodules.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/check-submodules.sh

## core-coding.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ai-workflows/core-coding.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/core-coding.sh

## debugging-testing.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ai-workflows/debugging-testing.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/debugging-testing.sh

## doctor.sh (2)

- subrepo: 1
  - .dev/automation/scripts/doctor.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/doctor.sh

## erpnext-export.sh (2)

- subrepo: 1
  - .dev/automation/scripts/erpnext-export.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/erpnext-export.sh

## erpnext-verify-checksums.sh (2)

- subrepo: 1
  - .dev/automation/scripts/erpnext-verify-checksums.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/erpnext-verify-checksums.sh

## fusion-pipeline.sh (2)

- subrepo: 2
  - .dev/automation/scripts/fusion-pipeline.sh
  - platform/n00clear-fusion/scripts/fusion-pipeline.sh

## generate_handover_packet.py (2)

- templates: 1
  - platform/n00-frontiers/applications/scaffolder/templates/handover-kit/{{cookiecutter.project_slug}}/scripts/generate_handover_packet.py
- subrepo: 1
  - resources/n00tropic Handover Kit/scripts/generate_handover_packet.py

## generate-renovate-dashboard.py (2)

- subrepo: 1
  - .dev/automation/scripts/generate-renovate-dashboard.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/generate-renovate-dashboard.py

## get-latest-tool-versions.py (2)

- subrepo: 1
  - .dev/automation/scripts/get-latest-tool-versions.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/get-latest-tool-versions.py

## ingest-frontiers.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ingest-frontiers.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ingest-frontiers.sh

## meta-check.sh (2)

- subrepo: 1
  - .dev/automation/scripts/meta-check.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/meta-check.sh

## planning-research.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ai-workflows/planning-research.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/planning-research.sh

## project-control-panel.py (2)

- subrepo: 1
  - .dev/automation/scripts/project-control-panel.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/project-control-panel.py

## project-lifecycle-radar.py (2)

- subrepo: 1
  - .dev/automation/scripts/project-lifecycle-radar.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/project-lifecycle-radar.py

## project-lifecycle-radar.sh (2)

- subrepo: 1
  - .dev/automation/scripts/project-lifecycle-radar.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/project-lifecycle-radar.sh

## project-record-job.sh (2)

- subrepo: 1
  - .dev/automation/scripts/project-record-job.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/project-record-job.sh

## record-capability-run.py (2)

- subrepo: 1
  - .dev/automation/scripts/record-capability-run.py
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/record-capability-run.py

## refresh-workspace.sh (2)

- subrepo: 1
  - .dev/automation/scripts/refresh-workspace.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/refresh-workspace.sh

## review-deployment.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ai-workflows/review-deployment.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/review-deployment.sh

## sync-trunk-configs.sh (2)

- subrepo: 1
  - .dev/automation/scripts/sync-trunk-configs.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/sync-trunk-configs.sh

## trunk-upgrade.sh (2)

- subrepo: 1
  - .dev/automation/scripts/trunk-upgrade.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/trunk-upgrade.sh

## workflow-utils.sh (2)

- subrepo: 1
  - .dev/automation/scripts/ai-workflows/workflow-utils.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/ai-workflows/workflow-utils.sh

## workspace-release.sh (2)

- subrepo: 1
  - .dev/automation/scripts/workspace-release.sh
- automation: 1
  - platform/n00tropic/.dev/automation/scripts/workspace-release.sh
