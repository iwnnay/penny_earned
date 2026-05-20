import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5400,
		strictPort: true
	},
	test: {
		expect: { requireAssertions: true },
		name: 'server',
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
