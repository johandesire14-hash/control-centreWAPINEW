---
    name: Imported artifact-shaped projects
    description: What to do when a GitHub-imported project already has artifacts/*/.replit-artifact/artifact.toml files but no running workflows and listArtifacts() returns empty.
    ---

    On import, a project can already be laid out as Replit artifacts (artifact.toml present per artifacts/<slug>/.replit-artifact/) without those artifacts being registered in the runtime — listArtifacts() returns [] and WorkflowsRestart fails with "doesn't exist", and the Screenshot tool's appPreview also fails with "Artifact not found" since it resolves via the same registry.

    **Why:** createArtifact() cannot be reused (fails on existing slug/dir), and there is no "register existing artifact" callback. The artifact.toml files still fully describe the intended dev command, port, and preview path.

    **How to apply:** Read each artifacts/<slug>/.replit-artifact/artifact.toml for its services[].name, services.development.run command, and localPort. Recreate matching workflows manually with configureWorkflow, naming them exactly "artifacts/<slug>: <service-name>" for convention, and set the command to run with `PORT=<localPort>` prefixed (configureWorkflow's waitForPort does not itself inject PORT into the command). Confirm the proxy already routes correctly (curl https://$REPLIT_DEV_DOMAIN/<previewPath>) even without registry sync — it did in the one case tested.
    