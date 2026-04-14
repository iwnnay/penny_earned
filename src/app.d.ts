declare global {
    namespace App {
        interface Locals {
            user?: { user_id: number; email: string };
        }
    }
}

export {};
