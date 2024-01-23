import { AccountAuthenticator, Network } from '@aptos-labs/ts-sdk';
import {
  AnyRawTransaction,
  AptosWalletErrorResult,
  InputTransactionData,
  PluginProvider,
  TransactionOptions,
} from "@aptos-labs/wallet-adapter-core";
import type {
  AccountInfo,
  AdapterPlugin,
  NetworkInfo,
  SignMessagePayload,
  SignMessageResponse,
  WalletName,
} from "@aptos-labs/wallet-adapter-core";
import { TxnBuilderTypes, Types } from "aptos";
import { convertV1toV2, convertV2PayloadToV1Payload, convertV2toV1 } from './conversion';
import { codeToError } from './errors';

function remapPetraError(error: any): never {
  if ("code" in error) {
    throw codeToError(error.code);
  }
  throw error;
}

interface PetraWindow extends Window {
  petra?: PluginProvider;
}

declare const window: PetraWindow;

export const PetraWalletName = "Petra" as WalletName<"Petra">;

export class PetraWallet implements AdapterPlugin {
  readonly name = PetraWalletName;
  readonly version = "v2";
  readonly url =
    "https://chrome.google.com/webstore/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci";
  readonly icon =
    "data:image/png;base64,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";

  provider: PluginProvider | undefined =
    typeof window !== "undefined" ? window.petra : undefined;

  deeplinkProvider(data: { url: string }): string {
    return `https://petra.app/explore?link=${data.url}`;
  }

  async connect(): Promise<AccountInfo> {
      const addressInfo = await this.provider!.connect().catch(remapPetraError);
      if (!addressInfo) throw `${PetraWalletName} Address Info Error`;
      return addressInfo;
  }

  async account(): Promise<AccountInfo> {
    const response = await this.provider!.account().catch(remapPetraError);
    if (!response) throw `${PetraWalletName} Account Error`;
    return response;
  }

  async disconnect(): Promise<void> {
    return this.provider!.disconnect().catch(remapPetraError);
  }

  async signAndSubmitTransaction(
    transaction: InputTransactionData | Types.TransactionPayload,
    options?: any,
  ): Promise<{ hash: Types.HexEncodedBytes }> {
    if ("data" in transaction) {
      const network = await this.network();
      const payload = await convertV2PayloadToV1Payload(transaction.data, network)
      return "type" in payload
        ? this.signAndSubmitTransaction(payload, options)
        : this.signAndSubmitBCSTransaction(payload);
    }

    const response = await this.provider!.signAndSubmitTransaction(
      transaction,
      options,
    ).catch(remapPetraError);
    return response as { hash: Types.HexEncodedBytes };
  }

  async signAndSubmitBCSTransaction(
    transaction: TxnBuilderTypes.TransactionPayload,
  ): Promise<{ hash: Types.HexEncodedBytes }> {
    const response = await this.provider!.signAndSubmitTransaction(
      transaction
    ).catch(remapPetraError);
    return response as { hash: Types.HexEncodedBytes };
  }

  async signMessage(message: SignMessagePayload): Promise<SignMessageResponse> {
    if (typeof message !== "object" || !message.nonce) {
      throw `${PetraWalletName} Invalid signMessage Payload`;
    }
    return this.provider!.signMessage(message).catch(remapPetraError);
  }

  async signTransaction(
    transactionOrPayload: Types.TransactionPayload | TxnBuilderTypes.TransactionPayload | AnyRawTransaction,
    optionsOrAsFeePayer?: TransactionOptions | boolean,
  ): Promise<AccountAuthenticator | Uint8Array> {
    // If "rawTransaction" is part of the args, then we have a v2 request
    if ("rawTransaction" in transactionOrPayload) {
      const transaction = transactionOrPayload;
      const asFeePayer = (optionsOrAsFeePayer as boolean | undefined) ?? false;
      const rawTxnV1 = convertV2toV1(transaction.rawTransaction, TxnBuilderTypes.RawTransaction);

      const secondarySignersAddressesV1 = transaction.secondarySignerAddresses?.map(
        (address) => convertV2toV1(address, TxnBuilderTypes.AccountAddress),
      );

      let rawTxn:
        | TxnBuilderTypes.RawTransaction
        | TxnBuilderTypes.FeePayerRawTransaction
        | TxnBuilderTypes.MultiAgentRawTransaction;

      if (asFeePayer) {
        const activeAccount = await this.account();
        const feePayerAddressV1 = TxnBuilderTypes.AccountAddress.fromHex(activeAccount.address);
        rawTxn = new TxnBuilderTypes.FeePayerRawTransaction(
          rawTxnV1,
          secondarySignersAddressesV1 ?? [],
          feePayerAddressV1,
        );
      } else if (transaction.feePayerAddress) {
        const feePayerAddressV1 = convertV2toV1(transaction.feePayerAddress, TxnBuilderTypes.AccountAddress);
        rawTxn = new TxnBuilderTypes.FeePayerRawTransaction(
          rawTxnV1,
          secondarySignersAddressesV1 ?? [],
          feePayerAddressV1,
        );
      } else if (secondarySignersAddressesV1) {
        rawTxn = new TxnBuilderTypes.MultiAgentRawTransaction(
          rawTxnV1,
          secondarySignersAddressesV1,
        );
      } else {
        rawTxn = rawTxnV1;
      }

      const { accountAuthenticator } = await (this.provider as any).signTransaction(
        { rawTxn },
      ).catch(remapPetraError);
      return convertV1toV2(accountAuthenticator, AccountAuthenticator);
    }

    const options = optionsOrAsFeePayer as TransactionOptions | undefined;
    return await (this.provider as any).signTransaction(
      transactionOrPayload,
      {
        maxGasAmount: options?.max_gas_amount
          ? Number(options?.max_gas_amount)
          : undefined,
        gasUnitPrice: options?.gas_unit_price
          ? Number(options?.gas_unit_price)
          : undefined,
      },
    ).catch(remapPetraError);
  }

  async onNetworkChange(callback?: (args: NetworkInfo) => void): Promise<void> {
    (this.provider as any)?.onNetworkChange(callback);
  }

  async onAccountChange(callback?: (args: AccountInfo) => void): Promise<void> {
    (this.provider as any)?.onAccountChange(callback);
  }

  async network(): Promise<NetworkInfo> {
    const response = await (window.petra as any).getNetwork().catch(remapPetraError);
    return {
      name: response.name as Network,
      chainId: response.chainId,
      url: response.url,
    };
  }
}
