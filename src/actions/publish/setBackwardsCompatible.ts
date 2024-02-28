import { Step } from "@sammarks/workflow";
import { WorkflowContext } from ".";
import { Logger } from "../../logger";
import { Inquirer } from "../../inquirer/Inquirer";
import { clean } from "semver";


export const setBackwardsCompatible: Step<WorkflowContext> = {
    name: 'set-backwards-compatible',
    run: async (context: WorkflowContext): Promise<void> => {
        if (context.runtime.packageExistsOnRegistry) {
            if (typeof (context.rawInput.package.backwardsCompatible) !== 'boolean') {
                var latestPublishedVersion: string;
                try{
                    const latestPublishedManifest = (await context.runtime.dummyPackage.fetchRemoteManifest('latest')).get();
                    latestPublishedVersion = clean(latestPublishedManifest.version);
                }catch(e){
                    Logger.error(e.toString(), true);
                    Logger.error(`Couldn't fetch latest remote version for backwards compatible prompt`, true);
                }
                if(!latestPublishedVersion){
                    latestPublishedVersion = `Unknown`;
                }
                const inq1 = await Inquirer.prompt({
                    type: "confirm",
                    message: `Is this release backwards compatible with the current latest release ${latestPublishedVersion}?`,
                    name: "backwardsCompatible",
                    default: true
                });
                context.runtime.manifest.backwardsCompatible = inq1.backwardsCompatible;
            } else {
                Logger.log(`Setting package backwards compatible: ${context.rawInput.package.backwardsCompatible} (input)`);
                context.runtime.manifest.backwardsCompatible = context.rawInput.package.backwardsCompatible;
            }
        } else {
            Logger.log(`Setting package backwards compatible by default because it's the first publish`);
            context.runtime.manifest.backwardsCompatible = true;
        }
    }
}