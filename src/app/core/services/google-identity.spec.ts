
import { TestBed } from '@angular/core/testing';
import { GoogleIdentity } from './google-identity';

describe('GoogleIdentity', () => {
    let service: GoogleIdentity;
    let originalGoogle: Window['google'];

    beforeEach(() => {
        originalGoogle = window.google;
        window.google = undefined;

        document
            .getElementById('google-identity-services')
            ?.remove();

        TestBed.configureTestingModule({});
        service = TestBed.inject(GoogleIdentity);
    });

    afterEach(() => {
        vi.restoreAllMocks();

        window.google = originalGoogle;

        document
            .getElementById('google-identity-services')
            ?.remove();
    });

    it('should retry after Google SDK loading fails', async () => {
        const scripts: HTMLScriptElement[] = [];

        vi.spyOn(document.head, 'appendChild')
            .mockImplementation((node) => {
                scripts.push(node as HTMLScriptElement);
                return node;
            });

        // Lần đầu: giả lập Google SDK tải thất bại
        const firstLoad = service.load();

        expect(scripts).toHaveLength(1);

        scripts[0].dispatchEvent(new Event('error'));

        await expect(firstLoad).rejects.toThrow(
            'Không thể tải Google Identity Services.'
        );

        // Lần thứ hai: SDK phải được phép tải lại
        const secondLoad = service.load();

        expect(scripts).toHaveLength(2);

        window.google = {
            accounts: {
                id: {
                    initialize: vi.fn(),
                    renderButton: vi.fn()
                }
            }
        };

        scripts[1].dispatchEvent(new Event('load'));

        await expect(secondLoad).resolves.toBeUndefined();
    });

    it('should render Google button using container width', async () => {
        const initialize = vi.fn();
        const renderButton = vi.fn();

        window.google = {
            accounts: {
                id: {
                    initialize,
                    renderButton
                }
            }
        };

        const container = document.createElement('div');

        Object.defineProperty(container, 'clientWidth', {
            configurable: true,
            value: 280
        });

        const callback = vi.fn();

        await service.renderButton(
            container,
            'test-google-client-id',
            callback
        );

        expect(initialize).toHaveBeenCalledWith(
            expect.objectContaining({
                client_id: 'test-google-client-id',
                callback
            })
        );

        expect(renderButton).toHaveBeenCalledWith(
            container,
            expect.objectContaining({
                width: 280
            })
        );
    });
});
