/**
 * This module stores Article Contents from pages
 * 
 * Brian Chivers, 3/19/2021
 * 
 * @module WebScience.Measurements.ArticleContents
 */

import * as Debugging from "../Utilities/Debugging.js"
import * as Storage from "../Utilities/Storage.js"
import * as Matching from "../Utilities/Matching.js"
import * as Messaging from "../Utilities/Messaging.js"

const debugLog = Debugging.getDebuggingLog("Measurements.ArticleContents");

/**
 * A KeyValueStorage object for data associated with the study.
 * @type {Object}
 * @private
 */
var storage = null;
var initialized = false;

var listeners = [];

/**
 * Start an article contents study.
 * @param {Object} options - A set of options for the study.
 * @param {string[]} [options.domains=[]] - The domains of interest for the study.
 */
export async function runStudy({
    domains = [ ]
}) {

    if(initialized)
        return;    
    initialized = true;

    storage = await (new Storage.KeyValueStorage("WebScience.Measurements.ArticleContents")).initialize();

    // Use a unique identifier for each webpage the user visits that has a matching domain
    var nextPageIdCounter = await (new Storage.Counter("WebScience.Measurements.ArticleContents.nextPageId")).initialize();

    // Build the URL matching set for content scripts
    var contentScriptMatches = Matching.createUrlMatchPatternArrayWithPath(domains, true);

    // Register the content script for storing Article Contents
    await browser.contentScripts.register({
        matches: contentScriptMatches,
        js: [
        {
            file: "/src/WebScience/Measurements/content-scripts/Readability.js"
        },
        {
            file: "/src/WebScience/Measurements/content-scripts/page-content.js"
        }
        ],
        runAt: "document_idle"
    });

    // Handle page depth events
    Messaging.registerListener("WebScience.articleContent", async (depthInfo, sender, sendResponse) => {
        var pageId = await nextPageIdCounter.getAndIncrement();
        depthInfo.url = Storage.normalizeUrl(sender.url);
        depthInfo.tabId = sender.tab.id;
        for (var listener of listeners) { listener(depthInfo); }
        storage.set(pageId.toString(), depthInfo);
        debugLog(JSON.stringify(depthInfo));
    }, {
        type: "string",
        url : "string",
        title : "string",
        text : "string"
    });
}

/* Utilities */

/**
 * Retrieve the study data as an object. Note that this could be very
 * slow if there is a large volume of study data.
 * @returns {(Object|null)} - The study data, or `null` if no data
 * could be retrieved.
 */
export async function getStudyDataAsObject() {
    if(storage != null)
        return await storage.getContentsAsObject();
    return null;
}

export function registerListener(listener) {
    listeners.push(listener);
}