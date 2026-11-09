
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

    /**
     * Load Google Identity Services SDK.
     * Reuse the pending request and allow retry after failure.
     */
    load(): Promise<void> {
        // SDK đã tải thành công
        if (window.google?.accounts?.id) {
            return Promise.resolve();
        }

        // Tránh tải SDK nhiều lần cùng lúc
        if (this.scriptPromise) {
            return this.scriptPromise;
        }

        const loadPromise = new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById(
                'google-identity-services'
            ) as HTMLScriptElement | null;

            // Xóa script cũ khi SDK chưa sẵn sàng
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');

            script.id = 'google-identity-services';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                if (window.google?.accounts?.id) {
                    resolve();
                } else {
                    reject(
                        new Error(
                            'Google Identity Services không tải được.'
                        )
                    );
                }
            };

            script.onerror = () => {
                reject(
                    new Error(
                        'Không thể tải Google Identity Services.'
                    )
                );
            };

            document.head.appendChild(script);
        });

        this.scriptPromise = loadPromise.catch(error => {
            // Reset Promise để lần sau có thể retry
            this.scriptPromise = undefined;

            document.getElementById(
                'google-identity-services'
            )?.remove();

            throw error;
        });

        return this.scriptPromise;
    }

    /**
     * Initialize Google Sign-In and render responsive button.
     */
    async renderButton(
        element: HTMLElement,
        clientId: string,
        callback: (response: GoogleCredentialResponse) => void
    ): Promise<void> {
        await this.load();

        const googleId = window.google?.accounts?.id;

        if (!googleId) {
            throw new Error(
                'Google Identity Services chưa sẵn sàng.'
            );
        }

        // Kiểm tra cấu hình Google Client ID
        if (!clientId.trim()) {
            throw new Error(
                'Google Client ID chưa được cấu hình.'
            );
        }

        // Lấy chiều rộng thực tế của vùng chứa
        const hostWidth = element.clientWidth;

        // Giới hạn Google button trong khoảng 200–400px
        // Nếu không đo được kích thước, dùng 400px
        const buttonWidth = Math.max(
            200,
            Math.min(400, hostWidth || 400)
        );

        // Xóa nút cũ nếu cần render lại
        element.replaceChildren();

        // Khởi tạo Google Sign-In
        googleId.initialize({
            client_id: clientId,
            callback,
            ux_mode: 'popup'
        });

        // Render nút Google theo kích thước vùng chứa
        googleId.renderButton(element, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: buttonWidth,
            locale: 'vi'
        });
    }
}
