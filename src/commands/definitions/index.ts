import { commandDefinition as sessionEdit } from '@commands/definitions/session/session-edit';
import { commandDefinition as sessionFinish } from '@commands/definitions/session/session-finish';
import { commandDefinition as sessionNext } from '@commands/definitions/session/session-next';
import { commandDefinition as sessionStart } from '@commands/definitions/session/session-start';
import { commandDefinition as configuration } from '@commands/definitions/system/configuration';
import { commandDefinition as ping } from '@commands/definitions/system/ping';
import { commandDefinition as qotdAdmin } from '@commands/definitions/system/qotd-admin';
import { commandDefinition as strings } from '@commands/definitions/system/strings';
import { commandDefinition as canonCharacter } from './character/canon-character.definition';
import { commandDefinition as originalCharacter } from './character/original-character.definition';
import { commandDefinition as hiatus } from './hiatus/hiatus';
import { commandDefinition as qotd } from './misc/qotd';
import { commandDefinition as show } from './user/show';

/** a default export as an array so all commands can be registered dynamically */
export default [
    ping(),
    sessionStart(),
    sessionFinish(),
    sessionNext(),
    sessionEdit(),
    configuration(),
    strings(),
    hiatus(),
    show(),
    qotd(),
    qotdAdmin(),
    canonCharacter(),
    originalCharacter(),
];
export {
    sessionStart,
    sessionNext,
    sessionFinish,
    sessionEdit,
    ping,
    configuration,
    strings,
    hiatus,
    show,
    qotd,
    qotdAdmin,
    canonCharacter,
    originalCharacter,
};
