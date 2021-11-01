/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
/* eslint-disable */
const tsconfig = require('./tsconfig.json');
const moduleNameMapper = require('tsconfig-paths-jest')(tsconfig);

module.exports = {
    moduleNameMapper,
    preset: 'ts-jest',
    testEnvironment: 'node',

    rootDir: './',

    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/**/*.ts',
        '!<rootDir>/**/*.module.ts',
        '!<rootDir>/src/server.ts',
    ],
    coverageProvider: 'v8',
    coverageReporters: ['clover', 'json', 'lcov', 'text', 'text-summary'],
    resetModules: true,
    // Add the community jest-extended matchers
    setupFilesAfterEnv: ['jest-extended'],
    verbose: false,
};
