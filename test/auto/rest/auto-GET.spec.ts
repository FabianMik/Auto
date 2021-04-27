/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { HttpStatus, nodeConfig } from '../../../src/shared';
import { agent, createTestserver } from '../../testserver';
import { afterAll, beforeAll, describe, test } from '@jest/globals';
import type { AddressInfo } from 'net';
import type { Auto } from '../../../src/auto/entity';
import { PATHS } from '../../../src/app';
import type { Server } from 'http';
import chai from 'chai';
import each from 'jest-each';
import fetch from 'node-fetch';

const { expect } = chai;

// IIFE (= Immediately Invoked Function Expression) statt top-level await
// https://developer.mozilla.org/en-US/docs/Glossary/IIFE
(async () => {
    // startWith(), endWith()
    const chaiString = await import('chai-string');
    chai.use(chaiString.default);
})();

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const modellVorhanden = ['a', 'e', 'g'];
const modellNichtVorhanden = ['xx', 'yy'];
const spezifikationenVorhanden = ['sitzheizung', 'automatik'];
const spezifikationenNichtVorhanden = ['csharp', 'php'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let server: Server;
const path = PATHS.autos;
let autosUri: string;

// Test-Suite
describe('GET /api/autos', () => {
    beforeAll(async () => {
        server = await createTestserver();

        const address = server.address() as AddressInfo;
        autosUri = `https://${nodeConfig.host}:${address.port}${path}`;
    });

    afterAll(() => { server.close() });

    test('Alle Autos', async () => {
        // given

        // when
        const response = await fetch(autosUri, { agent });

        // then
        const { status, headers } = response;
        expect(status).to.be.equal(HttpStatus.OK);
        expect(headers.get('Content-Type')).to.match(/json/iu);
        // https://jestjs.io/docs/en/expect
        // JSON-Array mit mind. 1 JSON-Objekt
        const autos: Array<any> = await response.json();
        expect(autos).not.to.be.empty;
        autos.forEach((auto) => {
            const selfLink = auto._links.self.href;
            expect(selfLink).to.have.string(path);
        });
    });

    each(modellVorhanden).test(
        'Autos mit einem Modell, der "%s" enthaelt',
        async (teilModell) => {
            // given
            const uri = `${autosUri}?modell=${teilModell}`;

            // when
            const response = await fetch(uri, { agent });

            // then
            const { status, headers } = response;
            expect(status).to.be.equal(HttpStatus.OK);
            expect(headers.get('Content-Type')).to.match(/json/iu);
            // JSON-Array mit mind. 1 JSON-Objekt
            const body = await response.json();
            expect(body).not.to.be.empty;

            // Jedes Auto hat einen Modell mit dem Teilstring 'a'
            body.map((auto: Auto) => auto.modell).forEach((modell: string) =>
                expect(modell.toLowerCase()).to.have.string(teilModell),
            );
        },
    );

    each(modellNichtVorhanden).test(
        'Keine Autos mit einem Modell, der "%s" nicht enthaelt',
        async (teilModell) => {
            // given
            const uri = `${autosUri}?modell=${teilModell}`;

            // when
            const response = await fetch(uri, { agent });

            // then
            expect(response.status).to.be.equal(HttpStatus.NOT_FOUND);
            const body = await response.text();
            expect(body).to.be.equalIgnoreCase('not found');
        },
    );

    each(spezifikationenVorhanden).test(
        'Mind. 1 Auto mit der Spezifikation "%s"',
        async (spezifikation) => {
            // given
            const uri = `${autosUri}?${spezifikation}=true`;

            // when
            const response = await fetch(uri, { agent });

            // then
            const { status, headers } = response;
            expect(status).to.be.equal(HttpStatus.OK);
            expect(headers.get('Content-Type')).to.match(/json/iu);
            // JSON-Array mit mind. 1 JSON-Objekt
            const body = await response.json();
            expect(body).not.to.be.empty;

            // Jedes Auto hat im Array der Spezifikationen "sitzheizung"
            body.map(
                (auto: Auto) => auto.spezifikationen,
            ).forEach((s: Array<string>) =>
                expect(s).to.include(spezifikation.toUpperCase()),
            );
        },
    );

    each(spezifikationenNichtVorhanden).test(
        'Keine Autos mit der Spezifikation "%s"',
        async (spezifikation) => {
            // given
            const uri = `${autosUri}?${spezifikation}=true`;

            // when
            const response = await fetch(uri, { agent });

            // then
            expect(response.status).to.be.equal(HttpStatus.NOT_FOUND);
            const body = await response.text();
            expect(body).to.be.equalIgnoreCase('not found');
        },
    );
});
