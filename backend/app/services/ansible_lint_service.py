"""
Ansible Validation Service

Provides ansible-lint and ansible-playbook --syntax-check validation for playbooks.
Uses subprocess to run validation tools and parses output.
"""

import subprocess
import tempfile
import json
import os
import re
from typing import List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class LintSeverity(str, Enum):
    """Severity levels for lint issues"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class LintIssue:
    """A single lint issue"""
    rule_id: str
    rule_description: str
    severity: LintSeverity
    message: str
    line: Optional[int] = None
    column: Optional[int] = None
    filename: Optional[str] = None

    def to_dict(self):
        return {
            "rule_id": self.rule_id,
            "rule_description": self.rule_description,
            "severity": self.severity.value,
            "message": self.message,
            "line": self.line,
            "column": self.column,
        }


@dataclass
class LintResult:
    """Result of ansible-lint validation"""
    is_valid: bool
    passed: bool
    issues: List[LintIssue] = field(default_factory=list)
    error_count: int = 0
    warning_count: int = 0
    info_count: int = 0
    raw_output: Optional[str] = None
    lint_available: bool = True

    def to_dict(self):
        return {
            "is_valid": self.is_valid,
            "passed": self.passed,
            "lint_available": self.lint_available,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "info_count": self.info_count,
            "issues": [issue.to_dict() for issue in self.issues],
        }


@dataclass
class SyntaxCheckResult:
    """Result of ansible-playbook --syntax-check"""
    syntax_valid: bool
    error_message: Optional[str] = None
    raw_output: Optional[str] = None

    def to_dict(self):
        return {
            "syntax_valid": self.syntax_valid,
            "error_message": self.error_message,
        }


@dataclass
class ValidationResult:
    """Combined result of lint + syntax-check validation"""
    # Overall status
    is_valid: bool  # True if no errors (syntax OK and no lint errors)

    # Syntax check results
    syntax_valid: bool
    syntax_error: Optional[str] = None

    # Lint results
    lint_passed: bool = True
    lint_available: bool = True
    lint_error_count: int = 0
    lint_warning_count: int = 0
    lint_info_count: int = 0
    lint_issues: List[LintIssue] = field(default_factory=list)

    # Ansible version used for validation
    ansible_version: Optional[str] = None

    def to_dict(self):
        return {
            "is_valid": self.is_valid,
            "syntax_valid": self.syntax_valid,
            "syntax_error": self.syntax_error,
            "lint_passed": self.lint_passed,
            "lint_available": self.lint_available,
            "lint_error_count": self.lint_error_count,
            "lint_warning_count": self.lint_warning_count,
            "lint_info_count": self.lint_info_count,
            "lint_issues": [issue.to_dict() for issue in self.lint_issues],
            "ansible_version": self.ansible_version,
        }


class AnsibleLintService:
    """
    Service for running ansible-lint and syntax-check on playbook content.

    Uses subprocess to execute validation tools with structured output.
    """

    def __init__(self):
        self._lint_available = None
        self._ansible_version = None

    def get_ansible_version(self) -> Optional[str]:
        """Get the installed Ansible version"""
        if self._ansible_version is None:
            try:
                result = subprocess.run(
                    ["ansible", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    # Parse version from output like "ansible [core 2.17.5]"
                    match = re.search(r'ansible \[core ([^\]]+)\]', result.stdout)
                    if match:
                        self._ansible_version = match.group(1)
                    else:
                        # Fallback: try first line
                        first_line = result.stdout.split('\n')[0]
                        version_match = re.search(r'(\d+\.\d+\.\d+)', first_line)
                        if version_match:
                            self._ansible_version = version_match.group(1)
            except (subprocess.SubprocessError, FileNotFoundError):
                self._ansible_version = None
        return self._ansible_version

    def is_lint_available(self) -> bool:
        """Check if ansible-lint is available on the system"""
        if self._lint_available is None:
            try:
                result = subprocess.run(
                    ["ansible-lint", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                self._lint_available = result.returncode == 0
            except (subprocess.SubprocessError, FileNotFoundError):
                self._lint_available = False
        return self._lint_available

    def syntax_check(self, yaml_content: str) -> SyntaxCheckResult:
        """
        Run ansible-playbook --syntax-check on YAML content.

        Args:
            yaml_content: The playbook YAML content as a string

        Returns:
            SyntaxCheckResult with validation status
        """
        # Create temporary file for the playbook
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yml',
            delete=False,
            encoding='utf-8'
        ) as tmp_file:
            tmp_file.write(yaml_content)
            tmp_path = tmp_file.name

        try:
            result = subprocess.run(
                [
                    "ansible-playbook",
                    "--syntax-check",
                    tmp_path
                ],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.dirname(tmp_path)
            )

            if result.returncode == 0:
                return SyntaxCheckResult(
                    syntax_valid=True,
                    raw_output=result.stdout
                )
            else:
                # Extract error message from stderr or stdout
                error_msg = result.stderr.strip() or result.stdout.strip()
                # Clean up the error message (remove file path)
                error_msg = re.sub(r'/tmp/[^\s]+', '<playbook>', error_msg)
                return SyntaxCheckResult(
                    syntax_valid=False,
                    error_message=error_msg,
                    raw_output=result.stderr or result.stdout
                )

        except subprocess.TimeoutExpired:
            return SyntaxCheckResult(
                syntax_valid=False,
                error_message="Syntax check timeout",
                raw_output="ansible-playbook --syntax-check timeout"
            )
        except FileNotFoundError:
            return SyntaxCheckResult(
                syntax_valid=False,
                error_message="ansible-playbook not available",
                raw_output="ansible-playbook command not found"
            )
        except Exception as e:
            return SyntaxCheckResult(
                syntax_valid=False,
                error_message=f"Error running syntax check: {str(e)}",
                raw_output=str(e)
            )
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    def validate(self, yaml_content: str) -> ValidationResult:
        """
        Run both syntax-check and ansible-lint on YAML content.

        Args:
            yaml_content: The playbook YAML content as a string

        Returns:
            ValidationResult with combined results
        """
        # Get Ansible version
        ansible_version = self.get_ansible_version()

        # Run syntax check first
        syntax_result = self.syntax_check(yaml_content)

        # Run lint (even if syntax fails, lint may provide useful info)
        lint_result = self.lint_yaml(yaml_content)

        # Combine results
        is_valid = syntax_result.syntax_valid and lint_result.error_count == 0

        return ValidationResult(
            is_valid=is_valid,
            syntax_valid=syntax_result.syntax_valid,
            syntax_error=syntax_result.error_message,
            lint_passed=lint_result.passed,
            lint_available=lint_result.lint_available,
            lint_error_count=lint_result.error_count,
            lint_warning_count=lint_result.warning_count,
            lint_info_count=lint_result.info_count,
            lint_issues=lint_result.issues,
            ansible_version=ansible_version
        )

    def lint_yaml(self, yaml_content: str) -> LintResult:
        """
        Run ansible-lint on YAML content.

        Args:
            yaml_content: The playbook YAML content as a string

        Returns:
            LintResult with all issues found
        """
        if not self.is_lint_available():
            return LintResult(
                is_valid=True,
                passed=True,
                lint_available=False,
                raw_output="ansible-lint not available"
            )

        # Create temporary file for the playbook
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yml',
            delete=False,
            encoding='utf-8'
        ) as tmp_file:
            tmp_file.write(yaml_content)
            tmp_path = tmp_file.name

        try:
            # Run ansible-lint with JSON output
            result = subprocess.run(
                [
                    "ansible-lint",
                    "--format", "json",
                    "--nocolor",
                    "-q",  # Quiet mode (less verbose)
                    tmp_path
                ],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=os.path.dirname(tmp_path)
            )

            return self._parse_lint_output(result)

        except subprocess.TimeoutExpired:
            return LintResult(
                is_valid=False,
                passed=False,
                lint_available=True,
                raw_output="ansible-lint timeout"
            )
        except Exception as e:
            return LintResult(
                is_valid=False,
                passed=False,
                lint_available=True,
                raw_output=f"Error running ansible-lint: {str(e)}"
            )
        finally:
            # Cleanup temporary file
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    def _parse_lint_output(self, result: subprocess.CompletedProcess) -> LintResult:
        """
        Parse ansible-lint JSON output.

        Args:
            result: subprocess result from ansible-lint

        Returns:
            Parsed LintResult
        """
        issues = []
        error_count = 0
        warning_count = 0
        info_count = 0

        # ansible-lint returns 0 if no issues, non-zero otherwise
        passed = result.returncode == 0

        # Try to parse JSON output
        output = result.stdout.strip()

        if output:
            try:
                lint_data = json.loads(output)

                # Handle list of issues
                if isinstance(lint_data, list):
                    for item in lint_data:
                        issue = self._parse_issue(item)
                        if issue:
                            issues.append(issue)
                            if issue.severity == LintSeverity.ERROR:
                                error_count += 1
                            elif issue.severity == LintSeverity.WARNING:
                                warning_count += 1
                            else:
                                info_count += 1

            except json.JSONDecodeError:
                # If not JSON, try to parse as text
                for line in output.split('\n'):
                    if line.strip():
                        issues.append(LintIssue(
                            rule_id="parse-error",
                            rule_description="Could not parse lint output",
                            severity=LintSeverity.WARNING,
                            message=line.strip()
                        ))
                        warning_count += 1

        # Check stderr for additional errors
        if result.stderr.strip():
            stderr_lines = result.stderr.strip().split('\n')
            for line in stderr_lines:
                if line.strip() and not line.startswith('WARNING'):
                    # Skip common non-error messages
                    if 'Loading' not in line and 'Examining' not in line:
                        issues.append(LintIssue(
                            rule_id="stderr",
                            rule_description="Lint stderr output",
                            severity=LintSeverity.INFO,
                            message=line.strip()
                        ))
                        info_count += 1

        return LintResult(
            is_valid=error_count == 0,
            passed=passed,
            lint_available=True,
            issues=issues,
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
            raw_output=output if output else result.stderr
        )

    def _parse_issue(self, item: dict) -> Optional[LintIssue]:
        """
        Parse a single lint issue from JSON.

        Args:
            item: Dictionary from ansible-lint JSON output

        Returns:
            LintIssue or None if parsing fails
        """
        try:
            # Determine severity from level or rule
            level = item.get("level", "warning").lower()
            if level in ["error", "fatal"]:
                severity = LintSeverity.ERROR
            elif level in ["warning", "warn"]:
                severity = LintSeverity.WARNING
            else:
                severity = LintSeverity.INFO

            # Extract location info
            location = item.get("location", {})
            if isinstance(location, dict):
                line = location.get("lines", {}).get("begin", None)
                if isinstance(line, dict):
                    line = line.get("line")
            else:
                line = None

            # Extract message (can be string or dict with 'body' key)
            message = item.get("message", item.get("content", "No message"))
            if isinstance(message, dict):
                message = message.get("body", str(message))
            message = str(message) if message else "No message"

            return LintIssue(
                rule_id=item.get("rule", {}).get("id", "unknown") if isinstance(item.get("rule"), dict) else item.get("rule", "unknown"),
                rule_description=item.get("rule", {}).get("description", "") if isinstance(item.get("rule"), dict) else "",
                severity=severity,
                message=message,
                line=line,
                column=None,
                filename=item.get("filename")
            )
        except Exception:
            return None


# Singleton instance
ansible_lint_service = AnsibleLintService()
