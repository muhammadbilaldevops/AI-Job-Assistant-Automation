# Shared library

`lib` contains framework-independent rules: PDF/Word/text extraction, profile normalization, matching and deduplication, master-prompt assembly, document validation, DOCX generation and persistence adapters. Keeping these rules outside the UI makes them testable and prevents a visual change from changing job-match behavior.
