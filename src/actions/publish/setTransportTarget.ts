import { Step } from "@sammarks/workflow";
import { WorkflowContext } from ".";
import { Inquirer } from "../../inquirer/Inquirer";
import { validateTransportTarget } from "../../inquirer";
import { SystemConnector } from "../../systemConnector";

export const setTransportTarget: Step<WorkflowContext> = {
    name: 'set-transport-target',
    run: async (context: WorkflowContext): Promise<void> => {
        var trTarget = context.rawInput.target;

        const systemTmscsys = await SystemConnector.getTransportTargets();
        if (!trTarget) {
            const inq2 = await Inquirer.prompt({
                type: "list",
                message: "Transport request target",
                name: "trTarget",
                validate: async (input: string) => {
                    return await validateTransportTarget(input, systemTmscsys);
                },
                choices: systemTmscsys.map(o => {
                    return {
                        name: `${o.sysnam} (${o.systxt})`,
                        value: o.sysnam
                    }
                })
            });
            trTarget = inq2.trTarget.trim().toUpperCase();
        } else {
            trTarget = trTarget.trim().toUpperCase();
            const trTargetValid = await validateTransportTarget(trTarget, systemTmscsys);
            if (trTargetValid && trTargetValid !== true) {
                throw new Error(trTargetValid);
            }
        }

        context.parsedInput.trTarget = trTarget;
    }
}