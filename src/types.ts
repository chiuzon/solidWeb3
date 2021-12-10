import type { AbstractConnector } from '@web3-react/abstract-connector'

export interface IWeb3Store {
    connector: AbstractConnector | undefined
    library: any,
    chainId: number,
    account: string | undefined | null,
    active: boolean,
    error: Error | undefined | null
}