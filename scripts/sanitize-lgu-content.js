console.error(
  "Automatic database rewriting is disabled. Review stored LGU data and prepare a verified, reversible migration before applying changes."
);
process.exitCode = 1;
