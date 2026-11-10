# Architecture rules

- Keep IoC export availability in a shared pure guard so loading, failure, and empty results cannot produce misleading downloads.