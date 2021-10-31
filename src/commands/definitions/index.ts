import { commandDefinition as sessionFinish } from '@commands/definitions/session/session-finish';
import { commandDefinition as sessionNext } from '@commands/definitions/session/session-next';
import { commandDefinition as sessionStart } from '@commands/definitions/session/session-start';
import { commandDefinition as ping } from '@commands/definitions/system/ping';

export default [ping, sessionStart(), sessionFinish(), sessionNext()];
