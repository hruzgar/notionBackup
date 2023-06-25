import { strict as assert } from 'node:assert'
import jsdom from 'jsdom'
import prettier from 'prettier'
import { log } from 'console'
import * as fs from 'fs'
import * as path from 'path'

const getClassArray = (elem) => {
    assert(elem && typeof elem === 'object')
    const noClass = !elem.hasAttribute('class')
    if (noClass) {
        return []
    }
    return elem
        .getAttribute('class')
        .split(' ')
        .filter((s) => s.trim())
}

export default ({ htmlPath }) => {
    assert(htmlPath && typeof htmlPath === 'string')

    const htmlStr = fs.readFileSync(htmlPath, 'utf8')
    const dom = new jsdom.JSDOM(htmlStr)
    const elems = dom.window.document.querySelectorAll('*')

    // remove ids
    elems.forEach((elem) => elem.removeAttribute('id'))

    // remove empty class attributes
    Array.from(elems)
        .filter((elem) => getClassArray(elem).length === 0)
        .forEach((elem) => elem.removeAttribute('class'))

    // fix attachment links
    const anchorWrappers = Array.from(elems).filter((elem) => getClassArray(elem).includes('source'))
    const anchors = anchorWrappers.map((wrapper) => wrapper.querySelector('a')).filter((anchor) => anchor)
    anchors.forEach((anchor) => {
        const hasHref = anchor.hasAttribute('href')
        if (!hasHref || !anchor.getAttribute('href')) {
            log('found anchor block without href / with external href in :', htmlPath)
            return
        }
        const link = anchor.getAttribute('href')
        if (link.startsWith('http')) {
            log('found external link in :', htmlPath)
            return
        }
        const filename = path.basename(link)
        anchor.textContent = filename
    })

    // add css injection
    const cssInjection = fs.readFileSync(path.join(process.cwd(), 'notionbackup', 'injection', 'inject.css'), 'utf8')
    assert(cssInjection && typeof cssInjection === 'string')
    const styleElem = dom.window.document.querySelector('style')
    styleElem.innerHTML = styleElem.innerHTML + '\n\n' + cssInjection

    // prettify html
    const optimizedHtmlStr = dom.serialize()
    const prettyHtmlStr = prettier.format(optimizedHtmlStr, {
        parser: 'html',
        tabWidth: 4,
        printWidth: 160,
        htmlWhitespaceSensitivity: 'ignore',
        bracketSameLine: true,
    })

    fs.writeFileSync(htmlPath, prettyHtmlStr)
    log('processed:', path.basename(htmlPath))
}
