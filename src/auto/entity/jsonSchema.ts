import type { GenericJsonSchema } from './GenericJsonSchema';

export const MAX_RATING = 5;

export const jsonSchema: GenericJsonSchema = {
    $schema: 'https://json-schema.org/draft/2019-09/schema',
    $id: 'http://acme.com/auto.json#',
    title: 'Auto',
    description: 'Eigenschaften eines Autos: Typen und Einschraenkungen',
    type: 'object',
    properties: {
        /* eslint-disable @typescript-eslint/naming-convention */
        _id: {
            type: 'string',
            pattern:
                '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$',
        },
        __v: {
            type: 'number',
            minimum: 0,
        },
        /* eslint-enable @typescript-eslint/naming-convention */
        modell: {
            type: 'string',
            pattern: '^\\w.*',
        },
        klimabilanz: {
            type: 'number',
            minimum: 0,
            maximum: MAX_RATING,
        },
        typ: {
            type: 'string',
            enum: ['COUPE', 'LIMOUSINE', ''],
        },
        marke: {
            type: 'string',
            enum: ['AUDI', 'BMW', ''],
        },
        preis: {
            type: 'number',
            minimum: 0,
        },
        rabatt: {
            type: 'number',
            exclusiveMinimum: 0,
            exclusiveMaximum: 1,
        },
        lieferbar: { type: 'boolean' },
        // https://github.com/ajv-validator/ajv-formats
        datum: { type: 'string', format: 'date' },
        modellnr: {
            type: 'string',
            // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
            // TODO https://github.com/ajv-validator/ajv-formats/issues/14
            pattern:
                '^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|' +
                '(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|' +
                '(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?' +
                '[0-9]+[- ]?[0-9]+[- ]?[0-9X]*',
        },
        // https://github.com/ajv-validator/ajv-formats
        homepage: { type: 'string', format: 'uri' },
        spezifikationen: {
            type: 'array',
            items: { type: 'string' },
        },
        herstellungsorte: {
            type: 'array',
            items: { type: 'object' },
        },
    },
    // modellnr ist NUR beim Neuanlegen ein Pflichtfeld
    // Mongoose bietet dazu die Funktion MyModel.findByIdAndUpdate()
    required: ['modell', 'typ', 'marke'],
    errorMessage: {
        properties: {
            modell:
                'Ein Automodell muss mit einem Autostaben, einer Ziffer oder _ beginnen.',
            klimabilanz: 'Eine Bilanz muss zwischen 0 und 5 liegen.',
            typ: 'Der Typ eines Autos muss LIMOUSINE oder COUPE sein.',
            marke:
                'Die Marke eines Autos muss BMW oder AUDI sein.',
            preis: 'Der Preis darf nicht negativ sein.',
            rabatt: 'Der Rabatt muss ein Wert zwischen 0 und 1 sein.',
            lieferbar: '"lieferbar" muss auf true oder false gesetzt sein.',
            datum: 'Das Datum muss im Format yyyy-MM-dd sein.',
            modellnr: 'Die Modell-Nummer ist nicht korrekt.',
            homepage: 'Die URL der Homepage ist nicht korrekt.',
        },
    },
    additionalProperties: false,
};
