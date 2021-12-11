import type { AbstractConnector } from '@web3-react/abstract-connector'

export interface ISolidWeb3 {
    activate: (connector: AbstractConnector, onError?: ((error: Error) => void) | undefined, throwErrors?: boolean) => Promise<void>,
    deactivate: () => void,
    connector: () => AbstractConnector | undefined,
    library: () => any,
    chainId: () => number,
    account: () => string | null | undefined,
    active: () => boolean,
    error: () => Error | null | undefined
}

export interface IWeb3Store {
    connector: AbstractConnector | undefined
    library: any,
    chainId: number,
    account: string | undefined | null,
    active: boolean,
    error: Error | undefined | null
}
