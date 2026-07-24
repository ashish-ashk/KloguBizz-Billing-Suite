import {
  ThemeService
} from "./chunk-KA6UE4DJ.js";
import {
  AuthService
} from "./chunk-CQ7MHBIQ.js";
import "./chunk-WHZ3LIXQ.js";
import {
  ToastService
} from "./chunk-GAHW2XA4.js";
import {
  Router,
  RouterOutlet,
  provideRouter,
  withComponentInputBinding
} from "./chunk-7NJVVAOQ.js";
import {
  APP_INITIALIZER,
  ApplicationRef,
  Injectable,
  InjectionToken,
  Injector,
  NEVER,
  NgModule,
  NgZone,
  PLATFORM_ID,
  Subject,
  __spreadValues,
  bootstrapApplication,
  catchError,
  concat,
  defer,
  delay,
  filter,
  from,
  fromEvent,
  inject,
  isDevMode,
  isPlatformBrowser,
  makeEnvironmentProviders,
  map,
  merge,
  of,
  provideHttpClient,
  publish,
  setClassMetadata,
  switchMap,
  take,
  tap,
  throwError,
  withInterceptors,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵinject
} from "./chunk-6LY2GHLX.js";

// src/app/app.component.ts
var AppComponent = class _AppComponent {
  theme;
  // Injecting eagerly instantiates the singleton so it starts applying the
  // organisation's saved theme (or the default) as soon as the app boots.
  constructor(theme) {
    this.theme = theme;
  }
  static \u0275fac = function AppComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AppComponent)(\u0275\u0275directiveInject(ThemeService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppComponent, selectors: [["app-root"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 1, vars: 0, template: function AppComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "router-outlet");
    }
  }, dependencies: [RouterOutlet], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "src\\app\\app.component.ts", lineNumber: 11 });
})();

// src/app/core/auth.guard.ts
var authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token)
    return true;
  return router.createUrlTree(["/login"]);
};
var superAdminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.isSuperAdmin())
    return true;
  return router.createUrlTree(["/dashboard"]);
};
var tenantAdminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.user()?.role === "admin")
    return true;
  return router.createUrlTree(["/dashboard"]);
};

// src/app/app.routes.ts
var routes = [
  { path: "login", loadComponent: () => import("./chunk-G3T675NR.js").then((m) => m.LoginComponent) },
  { path: "register", loadComponent: () => import("./chunk-VWU474MW.js").then((m) => m.RegisterComponent) },
  { path: "terms", data: { type: "terms" }, loadComponent: () => import("./chunk-7RT4D47J.js").then((m) => m.LegalPageComponent) },
  { path: "sla", data: { type: "sla" }, loadComponent: () => import("./chunk-7RT4D47J.js").then((m) => m.LegalPageComponent) },
  {
    path: "",
    canActivate: [authGuard],
    children: [
      { path: "dashboard", loadComponent: () => import("./chunk-SXY5RBNN.js").then((m) => m.DashboardComponent) },
      { path: "invoices", loadComponent: () => import("./chunk-L2L3ZCWQ.js").then((m) => m.InvoicesComponent) },
      { path: "invoices/new", loadComponent: () => import("./chunk-22FRIVFX.js").then((m) => m.InvoiceEditorComponent) },
      { path: "invoices/:id/edit", loadComponent: () => import("./chunk-22FRIVFX.js").then((m) => m.InvoiceEditorComponent) },
      { path: "invoices/:id/print", loadComponent: () => import("./chunk-NFJQ3VYV.js").then((m) => m.InvoicePrintComponent) },
      { path: "bill-generator", loadComponent: () => import("./chunk-7IYXXOHH.js").then((m) => m.BillGeneratorComponent) },
      { path: "bill-generator/:id/edit", loadComponent: () => import("./chunk-7IYXXOHH.js").then((m) => m.BillGeneratorComponent) },
      { path: "clients", loadComponent: () => import("./chunk-H3MAMGG7.js").then((m) => m.ClientsComponent) },
      { path: "items", loadComponent: () => import("./chunk-VGQBK3YD.js").then((m) => m.ItemsComponent) },
      { path: "payments", loadComponent: () => import("./chunk-JYJ6XLK5.js").then((m) => m.PaymentsComponent) },
      { path: "reports", loadComponent: () => import("./chunk-YO3JZIMX.js").then((m) => m.ReportsComponent) },
      { path: "users", loadComponent: () => import("./chunk-LROFBAR6.js").then((m) => m.UsersComponent) },
      { path: "subscription", loadComponent: () => import("./chunk-D2MIWI4W.js").then((m) => m.SubscriptionComponent) },
      { path: "appearance", canActivate: [tenantAdminGuard], loadComponent: () => import("./chunk-UOQ2IK7U.js").then((m) => m.AppearanceComponent) },
      { path: "invoice-templates", canActivate: [tenantAdminGuard], loadComponent: () => import("./chunk-5G4BTB2V.js").then((m) => m.InvoiceTemplatesComponent) },
      { path: "", pathMatch: "full", redirectTo: "dashboard" }
    ]
  },
  {
    path: "super-admin",
    canActivate: [superAdminGuard],
    loadComponent: () => import("./chunk-URM6TNIM.js").then((m) => m.SuperAdminLayoutComponent),
    children: [
      { path: "", pathMatch: "full", redirectTo: "organisations" },
      { path: "organisations", loadComponent: () => import("./chunk-46JYIAN2.js").then((m) => m.SuperOrganisationsComponent) },
      { path: "masters", loadComponent: () => import("./chunk-OXK42QIE.js").then((m) => m.SuperMastersComponent) },
      { path: "templates", loadComponent: () => import("./chunk-Z2KP6QBG.js").then((m) => m.SuperTemplatesComponent) },
      { path: "reminders", loadComponent: () => import("./chunk-LSRWDLDE.js").then((m) => m.SuperRemindersComponent) },
      { path: "plans", loadComponent: () => import("./chunk-MV2DDUTC.js").then((m) => m.SuperPlansComponent) },
      { path: "branding", loadComponent: () => import("./chunk-5623EF3R.js").then((m) => m.SuperBrandingComponent) },
      { path: "profile", loadComponent: () => import("./chunk-JGLZUQVK.js").then((m) => m.SuperProfileComponent) }
    ]
  },
  { path: "**", redirectTo: "dashboard" }
];

// src/app/core/auth.interceptor.ts
var authInterceptor = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = localStorage.getItem("klogubizz_token");
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authedReq).pipe(catchError((err) => {
    if (err.status === 401 && !req.url.includes("/auth/login") && !req.url.includes("/auth/register")) {
      if (err.error?.code === "SESSION_REVOKED") {
        toast.info("You were signed out because your account signed in on another device.");
      }
      localStorage.removeItem("klogubizz_token");
      localStorage.removeItem("klogubizz_user");
      localStorage.removeItem("klogubizz_org");
      router.navigateByUrl("/login");
    }
    return throwError(() => err);
  }));
};

// node_modules/@angular/service-worker/fesm2022/service-worker.mjs
var ERR_SW_NOT_SUPPORTED = "Service workers are disabled or not supported by this browser";
function errorObservable(message) {
  return defer(() => throwError(new Error(message)));
}
var NgswCommChannel = class {
  constructor(serviceWorker) {
    this.serviceWorker = serviceWorker;
    if (!serviceWorker) {
      this.worker = this.events = this.registration = errorObservable(ERR_SW_NOT_SUPPORTED);
    } else {
      const controllerChangeEvents = fromEvent(serviceWorker, "controllerchange");
      const controllerChanges = controllerChangeEvents.pipe(map(() => serviceWorker.controller));
      const currentController = defer(() => of(serviceWorker.controller));
      const controllerWithChanges = concat(currentController, controllerChanges);
      this.worker = controllerWithChanges.pipe(filter((c) => !!c));
      this.registration = this.worker.pipe(switchMap(() => serviceWorker.getRegistration()));
      const rawEvents = fromEvent(serviceWorker, "message");
      const rawEventPayload = rawEvents.pipe(map((event) => event.data));
      const eventsUnconnected = rawEventPayload.pipe(filter((event) => event && event.type));
      const events = eventsUnconnected.pipe(publish());
      events.connect();
      this.events = events;
    }
  }
  postMessage(action, payload) {
    return this.worker.pipe(take(1), tap((sw) => {
      sw.postMessage(__spreadValues({
        action
      }, payload));
    })).toPromise().then(() => void 0);
  }
  postMessageWithOperation(type, payload, operationNonce) {
    const waitForOperationCompleted = this.waitForOperationCompleted(operationNonce);
    const postMessage = this.postMessage(type, payload);
    return Promise.all([postMessage, waitForOperationCompleted]).then(([, result]) => result);
  }
  generateNonce() {
    return Math.round(Math.random() * 1e7);
  }
  eventsOfType(type) {
    let filterFn;
    if (typeof type === "string") {
      filterFn = (event) => event.type === type;
    } else {
      filterFn = (event) => type.includes(event.type);
    }
    return this.events.pipe(filter(filterFn));
  }
  nextEventOfType(type) {
    return this.eventsOfType(type).pipe(take(1));
  }
  waitForOperationCompleted(nonce) {
    return this.eventsOfType("OPERATION_COMPLETED").pipe(filter((event) => event.nonce === nonce), take(1), map((event) => {
      if (event.result !== void 0) {
        return event.result;
      }
      throw new Error(event.error);
    })).toPromise();
  }
  get isEnabled() {
    return !!this.serviceWorker;
  }
};
var SwPush = class _SwPush {
  /**
   * True if the Service Worker is enabled (supported by the browser and enabled via
   * `ServiceWorkerModule`).
   */
  get isEnabled() {
    return this.sw.isEnabled;
  }
  constructor(sw) {
    this.sw = sw;
    this.pushManager = null;
    this.subscriptionChanges = new Subject();
    if (!sw.isEnabled) {
      this.messages = NEVER;
      this.notificationClicks = NEVER;
      this.subscription = NEVER;
      return;
    }
    this.messages = this.sw.eventsOfType("PUSH").pipe(map((message) => message.data));
    this.notificationClicks = this.sw.eventsOfType("NOTIFICATION_CLICK").pipe(map((message) => message.data));
    this.pushManager = this.sw.registration.pipe(map((registration) => registration.pushManager));
    const workerDrivenSubscriptions = this.pushManager.pipe(switchMap((pm) => pm.getSubscription()));
    this.subscription = merge(workerDrivenSubscriptions, this.subscriptionChanges);
  }
  /**
   * Subscribes to Web Push Notifications,
   * after requesting and receiving user permission.
   *
   * @param options An object containing the `serverPublicKey` string.
   * @returns A Promise that resolves to the new subscription object.
   */
  requestSubscription(options) {
    if (!this.sw.isEnabled || this.pushManager === null) {
      return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
    }
    const pushOptions = {
      userVisibleOnly: true
    };
    let key = this.decodeBase64(options.serverPublicKey.replace(/_/g, "/").replace(/-/g, "+"));
    let applicationServerKey = new Uint8Array(new ArrayBuffer(key.length));
    for (let i = 0; i < key.length; i++) {
      applicationServerKey[i] = key.charCodeAt(i);
    }
    pushOptions.applicationServerKey = applicationServerKey;
    return this.pushManager.pipe(switchMap((pm) => pm.subscribe(pushOptions)), take(1)).toPromise().then((sub) => {
      this.subscriptionChanges.next(sub);
      return sub;
    });
  }
  /**
   * Unsubscribes from Service Worker push notifications.
   *
   * @returns A Promise that is resolved when the operation succeeds, or is rejected if there is no
   *          active subscription or the unsubscribe operation fails.
   */
  unsubscribe() {
    if (!this.sw.isEnabled) {
      return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
    }
    const doUnsubscribe = (sub) => {
      if (sub === null) {
        throw new Error("Not subscribed to push notifications.");
      }
      return sub.unsubscribe().then((success) => {
        if (!success) {
          throw new Error("Unsubscribe failed!");
        }
        this.subscriptionChanges.next(null);
      });
    };
    return this.subscription.pipe(take(1), switchMap(doUnsubscribe)).toPromise();
  }
  decodeBase64(input) {
    return atob(input);
  }
  static {
    this.\u0275fac = function SwPush_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SwPush)(\u0275\u0275inject(NgswCommChannel));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({
      token: _SwPush,
      factory: _SwPush.\u0275fac
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SwPush, [{
    type: Injectable
  }], () => [{
    type: NgswCommChannel
  }], null);
})();
var SwUpdate = class _SwUpdate {
  /**
   * True if the Service Worker is enabled (supported by the browser and enabled via
   * `ServiceWorkerModule`).
   */
  get isEnabled() {
    return this.sw.isEnabled;
  }
  constructor(sw) {
    this.sw = sw;
    if (!sw.isEnabled) {
      this.versionUpdates = NEVER;
      this.unrecoverable = NEVER;
      return;
    }
    this.versionUpdates = this.sw.eventsOfType(["VERSION_DETECTED", "VERSION_INSTALLATION_FAILED", "VERSION_READY", "NO_NEW_VERSION_DETECTED"]);
    this.unrecoverable = this.sw.eventsOfType("UNRECOVERABLE_STATE");
  }
  /**
   * Checks for an update and waits until the new version is downloaded from the server and ready
   * for activation.
   *
   * @returns a promise that
   * - resolves to `true` if a new version was found and is ready to be activated.
   * - resolves to `false` if no new version was found
   * - rejects if any error occurs
   */
  checkForUpdate() {
    if (!this.sw.isEnabled) {
      return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
    }
    const nonce = this.sw.generateNonce();
    return this.sw.postMessageWithOperation("CHECK_FOR_UPDATES", {
      nonce
    }, nonce);
  }
  /**
   * Updates the current client (i.e. browser tab) to the latest version that is ready for
   * activation.
   *
   * In most cases, you should not use this method and instead should update a client by reloading
   * the page.
   *
   * <div class="alert is-important">
   *
   * Updating a client without reloading can easily result in a broken application due to a version
   * mismatch between the application shell and other page resources,
   * such as lazy-loaded chunks, whose filenames may change between
   * versions.
   *
   * Only use this method, if you are certain it is safe for your specific use case.
   *
   * </div>
   *
   * @returns a promise that
   *  - resolves to `true` if an update was activated successfully
   *  - resolves to `false` if no update was available (for example, the client was already on the
   *    latest version).
   *  - rejects if any error occurs
   */
  activateUpdate() {
    if (!this.sw.isEnabled) {
      return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
    }
    const nonce = this.sw.generateNonce();
    return this.sw.postMessageWithOperation("ACTIVATE_UPDATE", {
      nonce
    }, nonce);
  }
  static {
    this.\u0275fac = function SwUpdate_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SwUpdate)(\u0275\u0275inject(NgswCommChannel));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({
      token: _SwUpdate,
      factory: _SwUpdate.\u0275fac
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SwUpdate, [{
    type: Injectable
  }], () => [{
    type: NgswCommChannel
  }], null);
})();
var SCRIPT = new InjectionToken(ngDevMode ? "NGSW_REGISTER_SCRIPT" : "");
function ngswAppInitializer(injector, script, options, platformId) {
  return () => {
    if (!(isPlatformBrowser(platformId) && "serviceWorker" in navigator && options.enabled !== false)) {
      return;
    }
    const ngZone = injector.get(NgZone);
    const appRef = injector.get(ApplicationRef);
    ngZone.runOutsideAngular(() => {
      const sw = navigator.serviceWorker;
      const onControllerChange = () => sw.controller?.postMessage({
        action: "INITIALIZE"
      });
      sw.addEventListener("controllerchange", onControllerChange);
      appRef.onDestroy(() => {
        sw.removeEventListener("controllerchange", onControllerChange);
      });
    });
    let readyToRegister$;
    if (typeof options.registrationStrategy === "function") {
      readyToRegister$ = options.registrationStrategy();
    } else {
      const [strategy, ...args] = (options.registrationStrategy || "registerWhenStable:30000").split(":");
      switch (strategy) {
        case "registerImmediately":
          readyToRegister$ = of(null);
          break;
        case "registerWithDelay":
          readyToRegister$ = delayWithTimeout(+args[0] || 0);
          break;
        case "registerWhenStable":
          const whenStable$ = from(injector.get(ApplicationRef).whenStable());
          readyToRegister$ = !args[0] ? whenStable$ : merge(whenStable$, delayWithTimeout(+args[0]));
          break;
        default:
          throw new Error(`Unknown ServiceWorker registration strategy: ${options.registrationStrategy}`);
      }
    }
    ngZone.runOutsideAngular(() => readyToRegister$.pipe(take(1)).subscribe(() => navigator.serviceWorker.register(script, {
      scope: options.scope
    }).catch((err) => console.error("Service worker registration failed with:", err))));
  };
}
function delayWithTimeout(timeout) {
  return of(null).pipe(delay(timeout));
}
function ngswCommChannelFactory(opts, platformId) {
  return new NgswCommChannel(isPlatformBrowser(platformId) && opts.enabled !== false ? navigator.serviceWorker : void 0);
}
var SwRegistrationOptions = class {
};
function provideServiceWorker(script, options = {}) {
  return makeEnvironmentProviders([SwPush, SwUpdate, {
    provide: SCRIPT,
    useValue: script
  }, {
    provide: SwRegistrationOptions,
    useValue: options
  }, {
    provide: NgswCommChannel,
    useFactory: ngswCommChannelFactory,
    deps: [SwRegistrationOptions, PLATFORM_ID]
  }, {
    provide: APP_INITIALIZER,
    useFactory: ngswAppInitializer,
    deps: [Injector, SCRIPT, SwRegistrationOptions, PLATFORM_ID],
    multi: true
  }]);
}
var ServiceWorkerModule = class _ServiceWorkerModule {
  /**
   * Register the given Angular Service Worker script.
   *
   * If `enabled` is set to `false` in the given options, the module will behave as if service
   * workers are not supported by the browser, and the service worker will not be registered.
   */
  static register(script, options = {}) {
    return {
      ngModule: _ServiceWorkerModule,
      providers: [provideServiceWorker(script, options)]
    };
  }
  static {
    this.\u0275fac = function ServiceWorkerModule_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ServiceWorkerModule)();
    };
  }
  static {
    this.\u0275mod = /* @__PURE__ */ \u0275\u0275defineNgModule({
      type: _ServiceWorkerModule
    });
  }
  static {
    this.\u0275inj = /* @__PURE__ */ \u0275\u0275defineInjector({
      providers: [SwPush, SwUpdate]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ServiceWorkerModule, [{
    type: NgModule,
    args: [{
      providers: [SwPush, SwUpdate]
    }]
  }], null, null);
})();

// src/main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000"
    })
  ]
}).catch((err) => console.error(err));
/*! Bundled license information:

@angular/service-worker/fesm2022/service-worker.mjs:
  (**
   * @license Angular v18.2.14
   * (c) 2010-2024 Google LLC. https://angular.io/
   * License: MIT
   *)
  (*!
   * @license
   * Copyright Google LLC All Rights Reserved.
   *
   * Use of this source code is governed by an MIT-style license that can be
   * found in the LICENSE file at https://angular.dev/license
   *)
*/
//# sourceMappingURL=main.js.map
