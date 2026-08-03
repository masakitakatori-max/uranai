import Capacitor
import Foundation
import StoreKit

/// StoreKit 2 を薄くラップする自前 Capacitor プラグイン。
/// RevenueCat 等の外部SaaSは採用せず、entitlement は Cloudflare D1 側で一元管理する
/// （バックエンド設計時の判断: docs参照）。
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                await self?.handleTransactionUpdate(result)
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self), !productIds.isEmpty else {
            call.reject("productIds is required")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: productIds)
                call.resolve(["products": products.map(serializeProduct)])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Unknown product: \(productId)")
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    await transaction.finish()
                    call.resolve(["status": "success", "transaction": serializeTransaction(transaction, jws: verification.jwsRepresentation)])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve(["transactions": await currentEntitlementTransactions()])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func getCurrentEntitlements(_ call: CAPPluginCall) {
        Task {
            call.resolve(["transactions": await currentEntitlementTransactions()])
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
                call.reject("表示中の画面が見つかりません。")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("サブスクリプション管理画面を開けませんでした: \(error.localizedDescription)")
            }
        }
    }

    private func currentEntitlementTransactions() async -> [[String: Any]] {
        var results: [[String: Any]] = []
        for await entitlement in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(entitlement) {
                results.append(serializeTransaction(transaction, jws: entitlement.jwsRepresentation))
            }
        }
        return results
    }

    private func handleTransactionUpdate(_ result: VerificationResult<Transaction>) async {
        guard let transaction = try? checkVerified(result) else {
            return
        }
        await transaction.finish()
        notifyListeners("transactionsUpdated", data: ["transaction": serializeTransaction(transaction, jws: result.jwsRepresentation)])
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitPluginError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    private func serializeProduct(_ product: Product) -> [String: Any] {
        [
            "id": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "price": NSDecimalNumber(decimal: product.price).doubleValue,
        ]
    }

    /// signedTransactionInfo はサーバー側での署名検証（App Store Server API / JWS）に使う生の JWS。
    /// jwsRepresentation は Transaction 自体ではなく VerificationResult 側のプロパティ。
    private func serializeTransaction(_ transaction: Transaction, jws: String) -> [String: Any] {
        [
            "productId": transaction.productID,
            "originalTransactionId": String(transaction.originalID),
            "transactionId": String(transaction.id),
            "purchaseDate": transaction.purchaseDate.timeIntervalSince1970 * 1000,
            "expirationDate": transaction.expirationDate.map { $0.timeIntervalSince1970 * 1000 } as Any,
            "signedTransactionInfo": jws,
        ]
    }
}

enum StoreKitPluginError: Error {
    case failedVerification
}
