import { Provider } from 'fuels';
import { defaultConfigurable } from '../configurables';

export class LocalProvider extends Provider {
    constructor() {
        super(defaultConfigurable.provider);
    }
}
