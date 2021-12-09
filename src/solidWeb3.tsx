import { createStore } from "solid-js/store";
import { Component, createContext, createEffect, createSignal, getListener, onCleanup, onError, onMount } from "solid-js";

import type { AbstractConnector } from '@web3-react/abstract-connector'
import type { ConnectorUpdate } from '@web3-react/types'
import { ConnectorEvent } from '@web3-react/types'

import { IWeb3Store } from "./types";

export class UnsupportedChainIdError extends Error {
    public constructor(unsupportedChainId: number, supportedChainIds?: readonly number[]) {
      super()
      this.name = this.constructor.name
      this.message = `Unsupported chain id: ${unsupportedChainId}. Supported chain ids are: ${supportedChainIds}.`
    }
}

// https://github.com/NoahZinsmeister/web3-react/blob/v6/packages/core/src/normalizers.ts
function normalizeChainId(chainId: string | number): number {
    if (typeof chainId === 'string') {
        // Temporary fix until the next version of Metamask Mobile gets released.
        // In the current version (0.2.13), the chainId starts with “Ox” rather
        // than “0x”. Fix: https://github.com/MetaMask/metamask-mobile/pull/1275
        chainId = chainId.replace(/^Ox/, '0x')
  
        const parsedChainId = Number.parseInt(chainId, chainId.trim().substring(0, 2) === '0x' ? 16 : 10)
      
        Number.isNaN(parsedChainId) && ( () => { throw Error(`chainId ${chainId} is not an integer`) })()
  
        return parsedChainId
    } else {
        !Number.isInteger(chainId) && ( () => { throw Error(`chainId ${chainId} is not an integer`) })()

        return chainId
    }
}

//https://github.com/NoahZinsmeister/web3-react/blob/v6/packages/core/src/manager.ts#L96
async function parseUpdate(
    connector: AbstractConnector,
    update: ConnectorUpdate
): Promise<ConnectorUpdate<number>> {
    const provider = update.provider === undefined ? await connector.getProvider() : update.provider
    const [_chainId, _account] = (await Promise.all([
      update.chainId === undefined ? connector.getChainId() : update.chainId,
      update.account === undefined ? connector.getAccount() : update.account
    ])) as [Required<ConnectorUpdate>['chainId'], Required<ConnectorUpdate>['account']]
  
    const chainId = normalizeChainId(_chainId)
    if (!!connector.supportedChainIds && !connector.supportedChainIds.includes(chainId)) {
      throw new UnsupportedChainIdError(chainId, connector.supportedChainIds)
    }
    const account = _account
  
    return { provider, chainId, account }
}


const [web3Store, setWeb3Store] = createStore<IWeb3Store>({
    connector: undefined,
    library: undefined,
    chainId: 0,
    account: undefined,
    active: false,
    error: undefined
})

export const [getLibraryFunc, setGetLibraryFunc] = createSignal<undefined | {(provider: any) : any}>(undefined)

export function solidWeb3(): any {

    async function activate(
        connector: AbstractConnector,
        onError?: (error: Error) => void,
        throwErrors = false
    ): Promise<void>{
        let activated = false

        try {

        }catch(e){

        }
    }

    function deactivate(): void {

    }

    return {
        activate,
        deactivate,
        ...web3Store
    }
}

export const Web3Provider: Component<{getLibrary: (provider: any) => any}> = ({children, getLibrary}) => {
    
    onMount(() => {
        if(!getLibraryFunc){
            setGetLibraryFunc(() => getLibrary)
        }
    })

    async function handleUpdate(update: ConnectorUpdate): Promise<void> {
        const { error, connector } = web3Store

        if(!connector){
            throw("This should never happen, it's just so Typescript stops complaining")
        }

        if(!getLibraryFunc()){
            handleError(new Error("getLibrary isn't set"))
        }

        if(!error){
            const chainId = update.chainId === undefined ? undefined : normalizeChainId(update.chainId)

            if(chainId !== undefined 
                && !!web3Store.connector?.supportedChainIds 
                && !web3Store.connector?.supportedChainIds.includes(chainId)
            ){
                const error = new UnsupportedChainIdError(chainId, web3Store.connector?.supportedChainIds)
                handleError(error)

                setWeb3Store({
                    account: null
                })
            }else{
                const parsedUpdate = await parseUpdate(connector, update)

                setWeb3Store({
                    chainId: parsedUpdate.chainId,
                    account: parsedUpdate.account
                })
            }
        }else{
            try {
                const parsedUpdate = await parseUpdate(connector, update)


                setWeb3Store({
                    library: getLibraryFunc()!(parsedUpdate.provider) ,
                    chainId: parsedUpdate.chainId,
                    account: parsedUpdate.account,
                    error: undefined
                })
            }catch(error){
                handleError(error as Error)
            }
        }
    }

    function handleError(error: Error): void {
        setWeb3Store({error: error})
    }

    function handleDeactivate(): void {
        setWeb3Store({
            connector: undefined,
            library: undefined,
            chainId: 0,
            account: undefined,
            active: false,
            error: undefined
        })
    }

    createEffect(() => {
        const { connector } = web3Store

        onCleanup(() => {
            if(connector){
                connector.deactivate()
            }
        })    
    })

    createEffect(() => {
        const { connector } = web3Store

        if(connector){
           connector.on(ConnectorEvent.Update, handleUpdate)
           connector.on(ConnectorEvent.Error, handleError)
           connector.on(ConnectorEvent.Deactivate, handleDeactivate)
        }

        onCleanup(() => {
            if(connector){
                connector.off(ConnectorEvent.Update, handleUpdate)
                         .off(ConnectorEvent.Error, handleError)
                         .off(ConnectorEvent.Deactivate, handleDeactivate)
            }
        })    
    })

    return (
        <>
            {children}
        </>
    )
}
