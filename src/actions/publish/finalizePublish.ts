import { Step } from "@sammarks/workflow";
import { WorkflowContext } from ".";
import { Logger } from "../../logger";
import { SystemConnector } from "../../systemConnector";
import { createHash } from "crypto";
import { RegistryType } from "../../registry";

export const finalizePublish: Step<WorkflowContext> = {
    name: 'finalize-publish',
    run: async (context: WorkflowContext): Promise<void> => {
        Logger.loading(`Finalizing...`);
        try {
            //add to publish trkorr
            await SystemConnector.addSrcTrkorr(context.runtime.tadirTransport.trkorr);
            //in this step, it makes sense to turn tadir revert option on, it has been added to src trkorr table
            //and if we don't remove it after an error it will end up in the list of source packages
            Logger.log(`TADIR added to src trkorr table, setting try revert to true as reverting is possible`, true);
            context.runtime.tryTadirDeleteRevert = true;

            //generate integrity
            Logger.log(`Generating SHA512`, true);
            const integrity = createHash("sha512").update(context.runtime.artifact.binary).digest("hex");
            Logger.log(`SHA512: ${integrity}`, true);
            Logger.log(`Setting package integrity`, true);
            await SystemConnector.setPackageIntegrity({
                package_name: context.parsedInput.packageName,
                package_registry: context.runtime.registry.getRegistryType() === RegistryType.PUBLIC ? 'public' : context.runtime.registry.endpoint,
                integrity
            });

            context.output = {
                trmPackage: context.runtime.trmPackage
            };
        } catch (e) {
            Logger.error(e.toString(), true);
            Logger.error(`An error occurred during publish finalize. The package has been published, however TRM is inconsistent.`);
        }
        if (process.env.TRM_ENV === 'DEV') {
            throw new Error(`Running in development, rolling back publish`);
        }
    },
    revert: async (context: WorkflowContext): Promise<void> => {
        //TODO: delete record in integrity table
        if(context.output){
            delete context.output.trmPackage;
        }
    }
}