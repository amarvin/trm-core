import { Step } from "@sammarks/workflow";
import { WorkflowContext } from ".";
import { Logger } from "../../logger";

export const publishTrmArtifact: Step<WorkflowContext> = {
    name: 'publish-trm-artifact',
    run: async (context: WorkflowContext): Promise<void> => {
        Logger.loading(`Publishing TRM Artifact...`);
        await context.runtime.trmPackage.publish({
            artifact: context.runtime.artifact,
            readme: context.parsedInput.readme
        });
    }
}