import { CommandModule } from "yargs";

const command: CommandModule = {
  describe: "Manage Twake Workspaces",
  command: "workspace <command>",
  builder: yargs =>
    yargs.commandDir("workspace_cmds", {
      visit: commandModule => commandModule.default,
    }),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handler: () => {},
};

export default command;
