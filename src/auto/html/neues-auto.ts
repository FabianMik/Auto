/*
 * Copyright (C) 2018 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Funktion für EJS, um ein neues Auto anzulegen.
 * @packageDocumentation
 */

import type { Request, Response } from 'express';

/**
 * Funktion für EJS, um ein neues Auto anzulegen
 * @param _ nicht-benutztes Request-Objekt von Express
 * @param res Response-Objekt von Express
 */
export const neuesAuto = (_: Request, res: Response) => {
    res.render('neues-auto', { title: 'Neues Auto' });
};
