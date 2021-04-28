/* eslint-disable max-lines */
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

/**
 * Das Modul besteht aus der Klasse {@linkcode AuthService} für die
 * Authentifizierung.
 * @packageDocumentation
 */

import type { Auto, AutoData } from '../entity';
import {
    AutoInvalid,
    AutoNotExists,
    AutoServiceError,
    ModellExists,
    ModellnrExists,
    VersionInvalid,
    VersionOutdated,
} from './errors';
import { AutoModel, validateAuto } from '../entity';
import { cloud, logger, mailConfig } from '../../shared';
import type { QueryOptions } from 'mongoose';
import type { SendMailOptions } from 'nodemailer';

// API-Dokumentation zu Mongoose:
// http://mongoosejs.com/docs/api.html
// https://github.com/Automattic/mongoose/issues/3949

/* eslint-disable no-null/no-null, unicorn/no-useless-undefined, @typescript-eslint/no-unsafe-assignment */

/**
 * Die Klasse `AutoService` implementiert den Anwendungskern für Bücher und
 * greift mit _Mongoose_ auf MongoDB zu.
 */
export class AutoService {
    private static readonly UPDATE_OPTIONS: QueryOptions = { new: true };

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Auto asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Autos
     * @returns Das gefundene Auto vom Typ {@linkcode AutoData} oder undefined
     */
    async findById(id: string) {
        logger.debug('AutoService.findById(): id=%s', id);

        // ein Auto zur gegebenen ID asynchron mit Mongoose suchen
        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // Das Resultat ist null, falls nicht gefunden.
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document,
        // so dass u.a. der virtuelle getter "id" auch nicht mehr vorhanden ist.
        const auto = await AutoModel.findById(id).lean<AutoData | null>();
        logger.debug('AutoService.findById(): auto=%o', auto);

        if (auto === null) {
            return undefined;
        }

        this.deleteTimestamps(auto);
        return auto;
    }

    /**
     * Bücher asynchron suchen.
     * @param query Die DB-Query als JSON-Objekt
     * @returns Ein JSON-Array mit den gefundenen Büchern. Ggf. ist das Array leer.
     */
    // eslint-disable-next-line max-lines-per-function
    async find(query?: any | undefined) {
        logger.debug('AutoService.find(): query=%o', query);

        // alle Autos asynchron suchen u. aufsteigend nach modell sortieren
        // https://docs.mongodb.org/manual/reference/object-id
        // entries(): { modell: 'a', klimabilanz: 5 } => [{ modell: 'x'}, {klimabilanz: 5}]
        if (query === undefined || Object.entries(query).length === 0) {
            logger.debug('AutoService.find(): alle Autos');
            // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
            const autos = await AutoModel.find()
                .sort('modell')
                .lean<AutoData[]>();
            for await (const auto of autos) {
                this.deleteTimestamps(auto);
            }
            return autos;
        }

        // { modell: 'a', klimabilanz: 5, sitzheizung: true }
        // Rest Properties
        const { modell, sitzheizung, automatik, ...dbQuery } = query;

        // Autos zur Query (= JSON-Objekt durch Express) asynchron suchen
        // Modell in der Query: Teilstring des Modells,
        // d.h. "LIKE" als regulaerer Ausdruck
        // 'i': keine Unterscheidung zw. Gross- u. Kleinschreibung
        // NICHT /.../, weil das Muster variabel sein muss
        // CAVEAT: KEINE SEHR LANGEN Strings wg. regulaerem Ausdruck
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        if (modell !== undefined && modell.length < 10) {
            // RegExp statt Re2 wegen Mongoose
            dbQuery.modell = new RegExp(modell, 'iu'); // eslint-disable-line security/detect-non-literal-regexp, security-node/non-literal-reg-expr
        }

        // z.B. {sitzheizung: true, automatik: true}
        const spezifikationen = [];
        if (sitzheizung === 'true') {
            spezifikationen.push('SITZHEIZUNG');
        }
        if (automatik === 'true') {
            spezifikationen.push('AUTOMATIK');
        }
        if (spezifikationen.length === 0) {
            delete dbQuery.spezifikationen;
        } else {
            dbQuery.spezifikationen = spezifikationen;
        }

        logger.debug('AutoService.find(): dbQuery=%o', dbQuery);

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // leeres Array, falls nichts gefunden wird
        // AutoModel.findOne(query), falls das Suchkriterium eindeutig ist
        // bei findOne(query) wird null zurueckgeliefert, falls nichts gefunden
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        const autos = await AutoModel.find(dbQuery).lean<AutoData[]>();
        for await (const auto of autos) {
            this.deleteTimestamps(auto);
        }

        return autos;
    }

    /**
     * Ein neues Auto soll angelegt werden.
     * @param auto Das neu abzulegende Auto
     * @returns Die ID des neu angelegten Autos oder im Fehlerfall
     * - {@linkcode AutoInvalid} falls die Autodaten gegen Constraints verstoßen
     * - {@linkcode ModellnrExists} falls die Modell-Nr bereits existiert
     * - {@linkcode ModellExists} falls der Modell bereits existiert
     */
    async create(
        auto: Auto,
    ): Promise<AutoInvalid | ModellExists | ModellnrExists | string> {
        logger.debug('AutoService.create(): auto=%o', auto);
        const validateResult = await this.validateCreate(auto);
        if (validateResult instanceof AutoServiceError) {
            return validateResult;
        }

        const autoModel = new AutoModel(auto);
        const saved = await autoModel.save();
        const id = saved._id as string; // eslint-disable-line @typescript-eslint/non-nullable-type-assertion-style
        logger.debug('AutoService.create(): id=%s', id);

        await this.sendmail(auto);

        return id;
    }

    /**
     * Ein vorhandenes Auto soll aktualisiert werden.
     * @param auto Das zu aktualisierende Auto
     * @param versionStr Die Versionsnummer für optimistische Synchronisation
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     *  oder im Fehlerfall
     *  - {@linkcode AutoInvalid}, falls Constraints verletzt sind
     *  - {@linkcode AutoNotExists}, falls das Auto nicht existiert
     *  - {@linkcode ModellExists}, falls der Modell bereits existiert
     *  - {@linkcode VersionInvalid}, falls die Versionsnummer ungültig ist
     *  - {@linkcode VersionOutdated}, falls die Versionsnummer nicht aktuell ist
     */
    async update(
        auto: Auto,
        versionStr: string,
    ): Promise<
        | AutoInvalid
        | AutoNotExists
        | ModellExists
        | VersionInvalid
        | VersionOutdated
        | number
    > {
        logger.debug('AutoService.update(): auto=%o', auto);
        logger.debug('AutoService.update(): versionStr=%s', versionStr);

        const validateResult = await this.validateUpdate(auto, versionStr);
        if (validateResult instanceof AutoServiceError) {
            return validateResult;
        }

        // findByIdAndReplace ersetzt ein Document mit ggf. weniger Properties
        const autoModel = new AutoModel(auto);
        // Weitere Methoden zum Aktualisieren:
        //    Auto.findOneAndUpdate(update)
        //    auto.updateOne(bedingung)
        const updated = await AutoModel.findByIdAndUpdate(
            auto._id,
            autoModel,
            AutoService.UPDATE_OPTIONS,
        ).lean<AutoData | null>();
        if (updated === null) {
            return new AutoNotExists(auto._id);
        }

        const version = updated.__v as number; // eslint-disable-line @typescript-eslint/non-nullable-type-assertion-style
        logger.debug('AutoService.update(): version=%d', version);

        return Promise.resolve(version);
    }

    /**
     * Ein Auto wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Autos
     * @returns true, falls das Auto vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: string) {
        logger.debug('AutoService.delete(): id=%s', id);

        // Das Auto zur gegebenen ID asynchron loeschen
        const deleted = await AutoModel.findByIdAndDelete(id).lean();
        logger.debug('AutoService.delete(): deleted=%o', deleted);
        return deleted !== null;

        // Weitere Methoden von mongoose, um zu loeschen:
        //  Auto.findByIdAndRemove(id)
        //  Auto.findOneAndRemove(bedingung)
    }

    private deleteTimestamps(auto: AutoData) {
        delete auto.createdAt;
        delete auto.updatedAt;
    }

    private async validateCreate(auto: Auto) {
        const msg = validateAuto(auto);
        if (msg !== undefined) {
            logger.debug(
                'AutoService.validateCreate(): Validation Message: %o',
                msg,
            );
            return new AutoInvalid(msg);
        }

        // statt 2 sequentiellen DB-Zugriffen waere 1 DB-Zugriff mit OR besser

        const { modell } = auto;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await AutoModel.exists({ modell })) {
            return new ModellExists(modell);
        }

        const { modellnr } = auto;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await AutoModel.exists({ modellnr })) {
            return new ModellnrExists(modellnr);
        }

        logger.debug('AutoService.validateCreate(): ok');
        return undefined;
    }

    private async sendmail(auto: Auto) {
        if (cloud !== undefined || mailConfig.host === 'skip') {
            // In der Cloud kann man z.B. "@sendgrid/mail" statt
            // "nodemailer" mit lokalem Mailserver verwenden
            return;
        }

        const from = '"Joe Doe" <Joe.Doe@acme.com>';
        const to = '"Foo Bar" <Foo.Bar@acme.com>';
        const subject = `Neues Auto ${auto._id}`;
        const body = `Das Auto mit dem Modell <strong>${auto.modell}</strong> ist angelegt`;

        const data: SendMailOptions = { from, to, subject, html: body };
        logger.debug('sendMail(): data=%o', data);

        try {
            const nodemailer = await import('nodemailer'); // eslint-disable-line node/no-unsupported-features/es-syntax
            await nodemailer.createTransport(mailConfig).sendMail(data);
        } catch (err: unknown) {
            logger.error(
                'AutoService.create(): Fehler beim Verschicken der Email: %o',
                err,
            );
        }
    }

    private async validateUpdate(auto: Auto, versionStr: string) {
        const result = this.validateVersion(versionStr);
        if (typeof result !== 'number') {
            return result;
        }

        const version = result;
        logger.debug('AutoService.validateUpdate(): version=%d', version);
        logger.debug('AutoService.validateUpdate(): auto=%o', auto);

        const validationMsg = validateAuto(auto);
        if (validationMsg !== undefined) {
            return new AutoInvalid(validationMsg);
        }

        const resultModell = await this.checkModellExists(auto);
        if (resultModell !== undefined && resultModell.id !== auto._id) {
            return resultModell;
        }

        if (auto._id === undefined) {
            return new AutoNotExists(undefined);
        }

        const resultIdAndVersion = await this.checkIdAndVersion(
            auto._id,
            version,
        );
        if (resultIdAndVersion !== undefined) {
            return resultIdAndVersion;
        }

        logger.debug('AutoService.validateUpdate(): ok');
        return undefined;
    }

    private validateVersion(versionStr: string | undefined) {
        if (versionStr === undefined) {
            const error = new VersionInvalid(versionStr);
            logger.debug(
                'AutoService.validateVersion(): VersionInvalid=%o',
                error,
            );
            return error;
        }

        const version = Number.parseInt(versionStr, 10);
        if (Number.isNaN(version)) {
            const error = new VersionInvalid(versionStr);
            logger.debug(
                'AutoService.validateVersion(): VersionInvalid=%o',
                error,
            );
            return error;
        }

        return version;
    }

    private async checkModellExists(auto: Auto) {
        const { modell } = auto;

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        const result = await AutoModel.findOne(
            { modell },
            { _id: true },
        ).lean();
        if (result !== null) {
            const id = result._id;
            logger.debug('AutoService.checkModellExists(): _id=%s', id);
            return new ModellExists(modell, id);
        }

        logger.debug('AutoService.checkModellExists(): ok');
        return undefined;
    }

    private async checkIdAndVersion(id: string, version: number) {
        const autoDb: AutoData | null = await AutoModel.findById(id).lean();
        if (autoDb === null) {
            const result = new AutoNotExists(id);
            logger.debug(
                'AutoService.checkIdAndVersion(): AutoNotExists=%o',
                result,
            );
            return result;
        }

        // nullish coalescing
        const versionDb = autoDb.__v ?? 0;
        if (version < versionDb) {
            const result = new VersionOutdated(id, version);
            logger.debug(
                'AutoService.checkIdAndVersion(): VersionOutdated=%o',
                result,
            );
            return result;
        }

        return undefined;
    }
}
/* eslint-enable no-null/no-null, unicorn/no-useless-undefined, @typescript-eslint/no-unsafe-assignment */
/* eslint-enable max-lines */
