import Capacitor

/// 同アプリ内蔵の自前プラグイン（npm パッケージ化していないもの）を登録するための
/// CAPBridgeViewController サブクラス。cap sync で自動反映される npm プラグインとは別に、
/// ここで手動登録する。
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StoreKitPlugin())
    }
}
