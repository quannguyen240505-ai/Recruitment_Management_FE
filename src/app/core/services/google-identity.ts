import { Injectable } from '@angular/core';

export interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
}

interface GoogleAccountsId {
    initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: 'popup' | 'redirect';
    }): void;

    renderButton(
        parent: HTMLElement,
        options: {
            type: 'standard';
            theme: 'outline';
            size: 'large';
            text: 'signin_with';
            shape: 'rectangular';
            logo_alignment: 'left';
            width: number;
            locale?: string;
        }
    ): void;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: GoogleAccountsId;
            };
        };
    }
}

@Injectable({
    providedIn: 'root'
})
export class GoogleIdentity {
    private scriptPromise?: Promise<void>;

    load(): Promise<void> {
        if (window.google?.accounts?.id) {
            return Promise.resolve();
        }

        if (this.scriptPromise) {
            return this.scriptPromise;
        }

        this.scriptPromise = new Promise<void>((resolve, reject) => {
            const existingScript =
                document.getElementById(
                    'google-identity-services'
                ) as HTMLScriptElement | null;

            const verifyLoaded = () => {
                if (window.google?.accounts?.id) {
                    resolve();
                } else {
                    reject(
                        new Error('Google Identity Services không tải được.')
                    );
                }
            };

            if (existingScript) {
                existingScript.addEventListener(
                    'load',
                    verifyLoaded,
                    { once: true }
                );

                existingScript.addEventListener(
                    'error',
                    () => reject(
                        new Error('Không thể tải Google Identity Services.')
                    ),
                    { once: true }
                );

                return;
            }

            const script = document.createElement('script');

            script.id = 'google-identity-services';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = verifyLoaded;

            script.onerror = () => {
                reject(
                    new Error('Không thể tải Google Identity Services.')
                );
            };

            document.head.appendChild(script);
        });

        return this.scriptPromise;
    }

    async renderButton(
        element: HTMLElement,
        clientId: string,
        callback: (response: GoogleCredentialResponse) => void
    ): Promise<void> {
        await this.load();

        const googleId = window.google?.accounts.id;

        if (!googleId) {
            throw new Error(
                'Google Identity Services chưa sẵn sàng.'
            );
        }

        googleId.initialize({
            client_id: clientId,
            callback,
            ux_mode: 'popup'
        });

        googleId.renderButton(element, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 400,
            locale: 'vi'
        });
    }
}