import { Step } from "@sammarks/workflow";
import { WorkflowContext } from ".";
import { SystemConnector } from "../../systemConnector";
import { Logger } from "../../logger";

export const setDevclassObjs: Step<WorkflowContext> = {
    name: 'set-devclass-objs',
    run: async (context: WorkflowContext): Promise<void> => {
        const devclass = context.parsedInput.devclass;
        Logger.loading(`Reading package objects...`);
        context.runtime.tadirObjects = await SystemConnector.getDevclassObjects(devclass, true);
    }
}