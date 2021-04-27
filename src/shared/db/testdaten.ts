/*
 * Copyright (C) 2020 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/**
 * Das Modul enthält Funktionen für den DB-Zugriff einschließlich GridFS und
 * Neuladen der Test-DB.
 * @packageDocumentation
 */

import type { AutoData } from '../../auto/entity';

/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Die Testdaten, um die Test-DB neu zu laden, als JSON-Array.
 */
export const testdaten: AutoData[] = [
    {
        _id: '00000000-0000-0000-0000-000000000001',
        modell: 'Alpine',
        klimabilanz: 4,
        typ: 'COUPE',
        marke: 'BMW',
        preis: 11.1,
        rabatt: 0.011,
        lieferbar: true,
        // https://docs.mongodb.com/manual/reference/method/Date
        datum: new Date('2020-02-01'),
        modellnr: '978-3897225831',
        homepage: 'https://acme.at/',
        spezifikationen: ['SITZHEIZUNG'],
        herstellungsorte: [
            {
                ort: 'Aschaffenburg',
                werk: 'A1',
            },
            {
                ort: 'Aschaffenburg',
                werk: 'A2',
            },
        ],
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        _id: '00000000-0000-0000-0000-000000000002',
        modell: 'Boxer',
        klimabilanz: 2,
        typ: 'LIMOUSINE',
        marke: 'AUDI',
        preis: 22.2,
        rabatt: 0.022,
        lieferbar: true,
        datum: new Date('2020-02-02'),
        modellnr: '978-3827315526',
        homepage: 'https://acme.biz/',
        spezifikationen: ['AUTOMATIK'],
        herstellungsorte: [
            {
                ort: 'Berlin',
                werk: 'B3',
            },
        ],
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        _id: '00000000-0000-0000-0000-000000000003',
        modell: 'Garmisch',
        klimabilanz: 1,
        typ: 'COUPE',
        marke: 'BMW',
        preis: 33.3,
        rabatt: 0.033,
        lieferbar: true,
        datum: new Date('2020-02-03'),
        modellnr: '978-0201633610',
        homepage: 'https://acme.com/',
        spezifikationen: ['SITZHEIZUNG', 'AUTOMATIK'],
        herstellungsorte: [
            {
                ort: 'Germersheim',
                werk: 'C1',
            },
        ],
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        _id: '00000000-0000-0000-0000-000000000004',
        modell: 'Diesel',
        klimabilanz: 3,
        typ: 'COUPE',
        marke: 'AUDI',
        preis: 44.4,
        rabatt: 0.044,
        lieferbar: true,
        datum: new Date('2020-02-04'),
        modellnr: '978-0387534046',
        homepage: 'https://acme.de/',
        spezifikationen: [],
        herstellungsorte: [
            {
                ort: 'Duisburg',
                werk: 'D3',
            },
        ],
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        _id: '00000000-0000-0000-0000-000000000005',
        modell: 'Erlkoenig',
        klimabilanz: 2,
        typ: 'LIMOUSINE',
        marke: 'BMW',
        preis: 55.5,
        rabatt: 0.055,
        lieferbar: true,
        datum: new Date('2020-02-05'),
        modellnr: '978-3824404810',
        homepage: 'https://acme.es/',
        spezifikationen: ['AUTOMATIK'],
        herstellungsorte: [
            {
                ort: 'Essen',
                werk: 'E1',
            },
        ],
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];
Object.freeze(testdaten);

/* eslint-enable @typescript-eslint/naming-convention */
