'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.makeBusinessSocket = void 0
const business_1 = require('../Utils/business')
const WABinary_1 = require('../WABinary')
const generic_utils_1 = require('../WABinary/generic-utils')
const messages_recv_1 = require('./messages-recv')

const makeBusinessSocket = config => {
    const sock = (0, messages_recv_1.makeMessagesRecvSocket)(config)
    const { authState, query, waUploadToServer } = sock

    const getCatalog = async ({ jid, limit, cursor }) => {
        const userJid = jid || authState?.creds?.me?.id
        const normalizedJid = (0, WABinary_1.jidNormalizedUser)(userJid)
        const queryParamNodes = [
            { tag: 'limit', attrs: {}, content: Buffer.from((limit || 10).toString()) },
            { tag: 'width', attrs: {}, content: Buffer.from('100') },
            { tag: 'height', attrs: {}, content: Buffer.from('100') }
        ]
        if (cursor) {
            queryParamNodes.push({ tag: 'after', attrs: {}, content: cursor })
        }
        const result = await query({
            tag: 'iq',
            attrs: { to: WABinary_1.S_WHATSAPP_NET, type: 'get', xmlns: 'w:biz:catalog' },
            content: [
                {
                    tag: 'product_catalog',
                    attrs: { jid: normalizedJid, allow_shop_source: 'true' },
                    content: queryParamNodes
                }
            ]
        })
        return (0, business_1.parseCatalogNode)(result)
    }

    const getCollections = async (jid, limit = 51) => {
        const userJid = jid || authState?.creds?.me?.id
        const normalizedJid = (0, WABinary_1.jidNormalizedUser)(userJid)
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'w:biz:catalog',
                smax_id: '35'
            },
            content: [
                {
                    tag: 'collections',
                    attrs: { biz_jid: normalizedJid },
                    content: [
                        { tag: 'collection_limit', attrs: {}, content: Buffer.from(limit.toString()) },
                        { tag: 'item_limit', attrs: {}, content: Buffer.from(limit.toString()) },
                        { tag: 'width', attrs: {}, content: Buffer.from('100') },
                        { tag: 'height', attrs: {}, content: Buffer.from('100') }
                    ]
                }
            ]
        })
        return (0, business_1.parseCollectionsNode)(result)
    }

    const getOrderDetails = async (orderId, tokenBase64) => {
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'fb:thrift_iq',
                smax_id: '5'
            },
            content: [
                {
                    tag: 'order',
                    attrs: { op: 'get', id: orderId },
                    content: [
                        {
                            tag: 'image_dimensions',
                            attrs: {},
                            content: [
                                { tag: 'width', attrs: {}, content: Buffer.from('100') },
                                { tag: 'height', attrs: {}, content: Buffer.from('100') }
                            ]
                        },
                        { tag: 'token', attrs: {}, content: Buffer.from(tokenBase64) }
                    ]
                }
            ]
        })
        return (0, business_1.parseOrderDetailsNode)(result)
    }

    const productUpdate = async (productId, update) => {
        const preparedUpdate = await (0, business_1.uploadingNecessaryImagesOfProduct)(update, waUploadToServer)
        const editNode = (0, business_1.toProductNode)(productId, preparedUpdate)
        const result = await query({
            tag: 'iq',
            attrs: { to: WABinary_1.S_WHATSAPP_NET, type: 'set', xmlns: 'w:biz:catalog' },
            content: [
                {
                    tag: 'product_catalog_edit',
                    attrs: { v: '1' },
                    content: [
                        editNode,
                        { tag: 'width', attrs: {}, content: '100' },
                        { tag: 'height', attrs: {}, content: '100' }
                    ]
                }
            ]
        })
        const productCatalogEditNode = (0, generic_utils_1.getBinaryNodeChild)(result, 'product_catalog_edit')
        const productNode = (0, generic_utils_1.getBinaryNodeChild)(productCatalogEditNode, 'product')
        return (0, business_1.parseProductNode)(productNode)
    }

    const productCreate = async create => {
        create.isHidden = !!create.isHidden
        const preparedCreate = await (0, business_1.uploadingNecessaryImagesOfProduct)(create, waUploadToServer)
        const createNode = (0, business_1.toProductNode)(undefined, preparedCreate)
        const result = await query({
            tag: 'iq',
            attrs: { to: WABinary_1.S_WHATSAPP_NET, type: 'set', xmlns: 'w:biz:catalog' },
            content: [
                {
                    tag: 'product_catalog_add',
                    attrs: { v: '1' },
                    content: [
                        createNode,
                        { tag: 'width', attrs: {}, content: '100' },
                        { tag: 'height', attrs: {}, content: '100' }
                    ]
                }
            ]
        })
        const productCatalogAddNode = (0, generic_utils_1.getBinaryNodeChild)(result, 'product_catalog_add')
        const productNode = (0, generic_utils_1.getBinaryNodeChild)(productCatalogAddNode, 'product')
        return (0, business_1.parseProductNode)(productNode)
    }

    const productDelete = async productIds => {
        const result = await query({
            tag: 'iq',
            attrs: { to: WABinary_1.S_WHATSAPP_NET, type: 'set', xmlns: 'w:biz:catalog' },
            content: [
                {
                    tag: 'product_catalog_delete',
                    attrs: { v: '1' },
                    content: productIds.map(id => ({
                        tag: 'product',
                        attrs: {},
                        content: [{ tag: 'id', attrs: {}, content: Buffer.from(id) }]
                    }))
                }
            ]
        })
        const productCatalogDelNode = (0, generic_utils_1.getBinaryNodeChild)(result, 'product_catalog_delete')
        return { deleted: +(productCatalogDelNode?.attrs?.deleted_count || 0) }
    }

    return {
        ...sock,
        logger: config.logger,
        getOrderDetails,
        getCatalog,
        getCollections,
        productCreate,
        productDelete,
        productUpdate
    }
}

exports.makeBusinessSocket = makeBusinessSocket