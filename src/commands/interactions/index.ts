import { commandDefinition as ping } from '@commands/interactions/application-ping';
import { commandDefinition as sessionStart } from '@commands/interactions/application-session-start';
export default [ping, sessionStart()];

export { ApplicationPing } from '@commands/interactions/application-ping';
export { ApplicationSessionStart } from '@commands/interactions/application-session-start';
