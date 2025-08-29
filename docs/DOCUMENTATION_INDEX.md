# Documentation Index - Single Source of Truth

> **🚨 DOCUMENTATION CREATION POLICY: NEVER CREATE NEW FILES WITHOUT EXPLICIT JUSTIFICATION**

## Active Documentation Structure (12 files maximum)

### Root Level Documentation (4 files)
- **README.md**: Project overview and quick start guide
- **CLAUDE.md**: Comprehensive developer reference (PRIMARY DEV GUIDE)
- **SECURITY.md**: Security implementation and policies  
- **AGENTS.md**: AI agent setup and usage instructions

### docs/ Directory (8 files maximum)
```
docs/
├── ARCHITECTURE.md         # System design and technical overview
├── api-reference.md        # API endpoints documentation  
├── development/            # Development guidelines (5 files)
│   ├── coding-standards.md
│   ├── testing-guide.md
│   ├── deployment-guide.md
│   ├── troubleshooting.md
│   └── performance-optimization.md
├── operations/             # Operations and maintenance (2 files)  
│   ├── runbook.md
│   └── monitoring.md
└── resources/              # Assets and changelog (2 files)
    ├── CHANGELOG.md
    └── assets/
```

## Documentation Principles

### NEVER CREATE FILES FOR:
- ❌ Temporary analysis reports
- ❌ Status summaries or progress reports  
- ❌ Implementation summaries
- ❌ Migration documentation (use git history)
- ❌ Test reports (use automated reporting)
- ❌ Duplicate specifications
- ❌ Archive directories

### ALWAYS PREFER:
- ✅ Edit existing files over creating new ones
- ✅ Add sections to established documents
- ✅ Use git history for change tracking
- ✅ Inline documentation in code
- ✅ Automated documentation generation

## File Creation Approval Process

Before creating ANY new documentation file:

1. **Check existing files** - Can this information be added to an existing document?
2. **Justify necessity** - Why can't this be handled through code comments, git commits, or existing docs?
3. **Identify lifecycle** - Is this permanent documentation or temporary analysis?
4. **Get approval** - New documentation files require explicit approval

## Maintenance

- **Maximum file count**: 12 documentation files total
- **Review cycle**: Monthly audit of all documentation
- **Cleanup trigger**: Any new file creation triggers immediate review
- **Archive policy**: NO archive directories - use git history instead

## Emergency Contacts

If documentation sprawl returns:
- Run the doc-curator-guardian agent immediately
- Remove ALL temporary/analysis files
- Consolidate information into existing structured documents

---

**Last updated**: $(date)  
**Total documentation files**: 12  
**Cleanup completed**: $(date) - Removed 80+ obsolete files