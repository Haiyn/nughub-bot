import { commandDefinition as sessionFinish } from '@commands/definitions/session/session-finish';
import { commandDefinition as sessionNext } from '@commands/definitions/session/session-next';
import { commandDefinition as sessionStart } from '@commands/definitions/session/session-start';
import { commandDefinition as ping } from '@commands/definitions/system/ping';

/** a default export as an array so all commands can be registered dynamically */
export default [ping(), sessionStart(), sessionFinish(), sessionNext()];
export { sessionStart };
export { sessionNext };
export { sessionFinish };
export { ping };
