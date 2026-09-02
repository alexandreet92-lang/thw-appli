//  HideKeyboardAccessoryBar.swift
//
//  Masque la barre d'accessoire du clavier iOS (les ▲ ▼ + « OK ») qui apparaît
//  au-dessus du clavier dans une WKWebView. Elle apparaît en dev ET en Release.
//
//  ── INSTALLATION (une seule fois, dans Xcode) ─────────────────────────────
//  1. Glisse CE fichier dans le projet Xcode :
//     Finder → ce fichier → glisser-déposer dans le dossier « App » du
//     navigateur de projet Xcode (sous App/App). Dans la fenêtre qui s'ouvre,
//     coche « Copy items if needed » ET la cible « App » (Add to target: App).
//     → c'est cette étape qui fait que Xcode le COMPILE.
//  2. Ouvre ios/App/App/AppDelegate.swift et, dans la fonction
//       func application(_ application: UIApplication,
//                        didFinishLaunchingWithOptions ...) -> Bool {
//     ajoute cette ligne juste avant « return true » :
//
//         WKWebViewAccessoryHider.hide()
//
//  3. Rebuild (Cmd+R). La barre a disparu.
//  ─────────────────────────────────────────────────────────────────────────

import UIKit
import WebKit
import ObjectiveC

enum WKWebViewAccessoryHider {
    /// Remplace `inputAccessoryView` de la vue interne de WKWebView par `nil`.
    static func hide() {
        guard let contentViewClass = NSClassFromString("WKContentView") else { return }
        let selector = #selector(getter: UIResponder.inputAccessoryView)
        guard let method = class_getInstanceMethod(contentViewClass, selector) else { return }
        let emptyAccessory: @convention(block) (AnyObject) -> UIView? = { _ in nil }
        method_setImplementation(method, imp_implementationWithBlock(emptyAccessory))
    }
}
