# FAQ

- **Runnable?** Yes, use README's local commands. Unreleased.
- **Verified sizes?** Browser scans passed 100 MiB and 1 GiB synthetic fixtures, not a universal device/file guarantee.
- **Large replacement?** Streaming code exists and 100 MiB disk write/readback checks pass; native browser saving is not end-to-end accepted.
- **Why no replacement export after compatible import?** Without a source handle, destination identity cannot be checked safely. Use native Open; unsupported browsers can still search.
- **Arbitrary regex or large editing?** Normal regex has a timeout; large mode is literal scanning/replacement export only.
- **GBK?** UTF-8 only currently.
- **Drafts after reload?** No. Only themes/preferences persist; dirty content warns before leaving.
- **Share themes?** Export/import custom JSON. Duplicate built-ins before customization.

[Full status and limits](implementation.md)

[简体中文](../zh/faq.md)
