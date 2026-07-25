---
name: production-code-audit
description: "Autonomously deep-scan entire codebase line-by-line, understand architecture and patterns, then systematically transform it to production-grade quality. Dùng khi file >500 lines cần tách module, fix architecture, giảm blast radius khi update."
risk: medium
source: antigravity-awesome-skills
date_added: "2026-05-14"
---

# Production Code Audit

## Overview

Autonomously analyze the entire codebase to understand its architecture, patterns, and purpose, then systematically transform it into production-grade code. Performs deep line-by-line scanning, identifies all issues across security, performance, architecture, and quality, then provides comprehensive fixes.

## When to Use

- `make this production-ready` / `audit my codebase`
- File quá lớn (>500 lines) cần tách module
- Update 1 chỗ cứ break chỗ khác (blast radius quá lớn)
- Chuẩn bị refactor FlowKit, clip_selector.py, sequential_chain.py

## How It Works

### Step 1: Autonomous Codebase Discovery

1. Scan all files recursively
2. Identify tech stack (Python, JS, shell scripts)
3. Map architecture and dependencies
4. Find entry points and data flow
5. Identify god files (>500 lines, >20 functions)

### Step 2: Comprehensive Issue Detection

**Architecture Issues:**
- God classes/files (>500 lines)
- Tight coupling between modules
- Missing separation of concerns
- Circular dependencies
- Poor module boundaries

**Security Vulnerabilities:**
- Hardcoded secrets/API keys
- Missing input validation
- Insecure file operations

**Performance Problems:**
- Synchronous operations that should be async
- Missing caching for repeated operations
- Inefficient algorithms
- Memory leaks in long-running scripts

**Code Quality Issues:**
- High cyclomatic complexity (>10)
- Code duplication
- Magic numbers
- Missing error handling
- Dead code

**Testing Gaps:**
- Missing tests for critical paths
- No edge case testing
- No regression tests

### Step 3: Automatic Fixes and Optimizations

1. Refactor architecture — break up god files, fix circular dependencies
2. Fix security issues — remove hardcoded secrets, add validation
3. Optimize performance — fix bottlenecks, add caching
4. Improve code quality — reduce complexity, remove duplication
5. Add missing tests — write tests for untested critical paths
6. Add error handling — graceful failure, logging

### Step 4: Verify and Report

1. Run all tests to ensure nothing broke
2. Measure improvements
3. Generate comprehensive report with before/after metrics

## Production Audit Checklist

### Architecture
- [ ] No god files (>500 lines)
- [ ] Clear module boundaries
- [ ] No circular dependencies
- [ ] Single responsibility per module

### Security
- [ ] No hardcoded secrets
- [ ] Input validation on all entry points
- [ ] Secure file operations

### Performance
- [ ] No obvious bottlenecks
- [ ] Async where applicable
- [ ] Caching for repeated operations

### Testing
- [ ] Tests for critical paths
- [ ] Edge cases covered
- [ ] Regression tests for known bugs

### Production Readiness
- [ ] Error tracking/logging
- [ ] Graceful failure modes
- [ ] Documentation for key functions

## Trigger Keywords

`audit codebase`, `production-ready`, `tách module`, `file quá lớn`, `refactor`, `giảm blast radius`
