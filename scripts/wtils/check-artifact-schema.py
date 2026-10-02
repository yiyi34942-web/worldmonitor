#!/usr/bin/env python3
"""Validate one Research Artifact JSON document against the contract schema."""

import json
import sys
from pathlib import Path

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "wtils" / "schemas" / "research" / "research_artifact_schema.json"


def main():
    schema = json.loads(SCHEMA_PATH.read_text())
    artifact = json.load(sys.stdin)
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(artifact), key=lambda item: list(item.absolute_path))
    payload = {
        "error_count": len(errors),
        "errors": [
            {"path": "/" + "/".join(str(part) for part in error.absolute_path), "message": error.message}
            for error in errors
        ],
    }
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
