'use strict'

const Mocha       = require('mocha')
const htmlCreator = require('html-creator')
const fs          = require('fs').promises
const path        = require('path')

const Spec = Mocha.reporters.Spec
const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END
} = Mocha.Runner.constants

class ImageReporter extends Spec {
  constructor(runner) {
    super(runner)

    this.images = []
    this.menu = ''
    this._indents = 0

    const getHtml = (menu, imagesContent) => {
      return [
        {
          type: 'head',
          content: [
            {
              type: 'title', content: 'Image Tests Report'
            },
            {
              type: 'style',
              content: `* {
                  box-sizing: border-box;
                }
                html, body {
                  margin: 0;
                  padding: 0;
                  overflow: hidden;
                }
                img {
                  width: 188px;
                  padding: 10px;
                }
                ul {
                  padding: 0 0 0 10px;
                  list-style-type: none;
                }
                a {
                  text-decoration: none;
                }
                h3 {
                  color: #2b2b2b;
                }
                .menu {
                  padding: 20px;
                  float: left;
                  height: 100vh;
                  width: 30%;
                  background: #f7f7f7;
                  overflow: auto;
                }
                .content {
                  float: left;
                  height: 100vh;
                  width: 70%;
                  padding: 20px;
                  box-shadow: 5px 5px 5px 5px #aaa;
                  overflow: auto;
                }
                .imageItem {
                  display: inline;
                  position: relative;
                  margin: 2px;
                  text-align: center;
                }
                .imageTitle {
                  color: white;
                  font-size: 12px;
                  padding: 3px;
                  background-color: #3c923c;
                  position: absolute;
                  left: 0;
                  top: 0;
                  display: inline;
                  width: 100%;
                }
                .imageTitleMissing {
                  color: white;
                  font-size: 12px;
                  padding: 3px;
                  background-color: #bf3030;
                  position: absolute;
                  left: 0;
                  top: 0;
                  display: inline;
                  width: 100%;
                }`
            }
          ]
        },
        {
          type: 'body',
          content: [
            {
              type: 'div',
              content: menu,
              attributes: { class: 'menu' }
            },
            {
              type: 'div',
              content: imagesContent,
              attributes: { class: 'content' }
            }
          ]
        }
      ]
    }

    const stats = runner.stats

    runner
      .once(EVENT_RUN_BEGIN, function () {
      })
      .on(EVENT_SUITE_BEGIN, (suite) => {
        if (suite.title !== '')
          this.menu += `<ul><h3>${suite.title}</h3>\n`
      })
      .on(EVENT_SUITE_END, (suite) => {
        if (suite.title !== '')
          this.menu += `</ul>\n`
      })
      .on(EVENT_TEST_PASS, test => {
        const link = test.fullTitle().replace(/\s/g, '_')
        this.menu += `<li><a style="color: #3c923c" href="#${link}">&#10004; ${test.title}</a></li>\n`
        if (test.ctx && test.ctx.screenshots)
          this.addScreenshotGroup(test.fullTitle(), test.title, test.ctx.screenshots, test.ctx.expectedScreenshots, false)
      })
      .on(EVENT_TEST_FAIL, (test, err) => {
        const link = test.fullTitle().replace(/\s/g, '_')
        this.menu += `<li><a style="color: #bf3030" href="#${link}">&#10008; ${test.title}</a></li>\n`
        if (test.ctx && test.ctx.screenshots)
          this.addScreenshotGroup(test.fullTitle(), test.title, test.ctx.screenshots, test.ctx.expectedScreenshots, true)
      })
      .once(EVENT_RUN_END, async () => {
        const html = new htmlCreator(getHtml(this.menu, this.images))
        await fs.writeFile('viewer.html', html.renderHTML())
      })
  }

  addScreenshotGroup(fullTitle, testTitle, screenshots, expectedScreenshots, isError) {
    const thumbnails = screenshots.map(imagePath => {
      return {
        type: 'div',
        attributes: { class: 'imageItem' },
        content: [
          {
            type: 'a',
            attributes: { href: imagePath, target: '_blank' },
            content: [
              {
                type: 'img',
                attributes: { src: imagePath }
              }
            ]
          },
          {
            type: 'div',
            attributes: { class: 'imageTitle' },
            content: path.basename(imagePath)
          }
        ]
      }
    })

    if (screenshots.length < expectedScreenshots) {
      for (let i = 0; i < (expectedScreenshots - screenshots.length); i++) {
        thumbnails.push({
          type: 'div',
          attributes: { class: 'imageItem' },
          content: [
            {
              type: 'a',
              attributes: { href: '#' },
              content: [
                {
                  type: 'img',
                  attributes: { src: 'missing.png', style: 'border: 1px solid #882020' }
                }
              ]
            },
            {
              type: 'div',
              attributes: { class: 'imageTitleMissing' },
              content: 'Not generated'
            }
          ]
        })
      }
    }

    this.images.push({
      type: 'span',
      content: [
        {
          type: 'hr',
          attributes: { style: `margin: 30px 0; display: ${this.images.length > 0 ? 'block':'none'}` },
        },
        {
          type: 'h2',
          attributes: { id: fullTitle.replace(/\s/g, '_'), style: `color: ${isError ? '#bf3030' : '#3c923c'}` },
          content: testTitle
        },
        {
          type: 'span',
          content: thumbnails
        }
      ]
    })
  }
}

module.exports = ImageReporter
