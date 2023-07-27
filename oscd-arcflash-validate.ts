import { css, html, LitElement, TemplateResult } from 'lit';
import { msg } from '@lit/localize';
import { property, query, state } from 'lit/decorators.js';

import '@material/mwc-button';
import '@material/mwc-formfield';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-list/mwc-radio-list-item';
import '@material/mwc-icon-button';

import './foundation/components/oscd-filter-button.js';
import './foundation/components/oscd-filtered-list.js';

import type { Dialog } from '@material/mwc-dialog';
import { compareNames } from './foundation/foundation.js';
import type { OscdFilteredList } from './foundation/components/oscd-filtered-list.js';
import { identity } from './foundation/identities/identity.js';
import { selector } from './foundation/identities/selector.js';

export default class ReplaceIEDs extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docName!: string;

  @state()
  private get iedList(): Element[] {
    return this.doc
      ? Array.from(this.doc.querySelectorAll(':root > IED')).sort((a, b) =>
          compareNames(a, b)
        )
      : [];
  }

  @state()
  selectedIEDs: string[] = [];

  @query('#dialog') dialogUI?: Dialog;

  @query('#replaceIeds') replaceIedsUI?: OscdFilteredList;

  async run() {
    this.dialogUI?.show();
  }

  private replaceIeds(): void {
    const selected = Array.isArray(this.replaceIedsUI?.selected)
      ? this.replaceIedsUI?.selected
      : [this.replaceIedsUI?.selected];

    if (!this.replaceIedsUI?.selected) return;

    let newGraphVizOutput = '';

    selected!.forEach(iedListItem => {
      const { id } = iedListItem!.dataset;

      const currentIed = this.doc.querySelector(selector('IED', id!))!;

      const currentIedName = currentIed.getAttribute('name')!;

      // console.log(currentIedName);
      // let connectionCount = 0;

      const cbUsage = new Map();

      Array.from(
        currentIed.querySelectorAll(
          ':scope LN > Inputs > ExtRef, :scope LN0 > Inputs > ExtRef'
        )
      )
        .filter(
          candidate =>
            candidate.getAttribute('intAddr')?.slice(0, 2) === 'VB' &&
            candidate.hasAttribute('intAddr') &&
            parseInt(candidate.getAttribute('intAddr')!.slice(2, 5), 10) < 20
        )
        .forEach(extRef => {
          const parentInputs = extRef.parentElement;
          const addressNumber = parseInt(
            extRef.getAttribute('intAddr')!.slice(2, 5),
            10
          );

          const srcCBName = extRef.getAttribute('srcCBName');
          const selectedIedName = extRef.getAttribute('iedName');

          if (
            !(
              extRef.getAttribute('serviceType') === 'GOOSE' &&
              extRef.getAttribute('srcLDInst') &&
              extRef.getAttribute('srcLNClass') &&
              srcCBName &&
              selectedIedName
            )
          )
            return;

          let hasTripInformation = null;
          let hasTripGuardInformation = null;
          let hasInvertedTripGuardInformation = null;
          let hasGooseTestInformation = null;
          let hasBusResetInformation = null;

          // trip information
          const tripInfo = parentInputs?.querySelector(
            `ExtRef[intAddr="VB${(addressNumber + 20)
              .toString(10)
              .padStart(3, '0')}|q=0x1FFF"]`
          );
          if (tripInfo) {
            hasTripInformation =
              tripInfo.getAttribute('iedName') === selectedIedName &&
              tripInfo.getAttribute('serviceType') === 'GOOSE' &&
              tripInfo.getAttribute('srcLDInst') === 'CFG' &&
              tripInfo.getAttribute('srcLNClass') === 'LLN0' &&
              tripInfo.getAttribute('srcCBName') === srcCBName &&
              tripInfo.getAttribute('ldInst') === 'ANN' &&
              tripInfo.getAttribute('prefix') === 'SVT' &&
              tripInfo.getAttribute('lnClass') === 'GGIO' &&
              tripInfo.getAttribute('lnInst') === '4' &&
              (tripInfo.getAttribute('doName') === 'Ind21' ||
                tripInfo.getAttribute('doName') === 'Ind24') &&
              tripInfo.getAttribute('daName') === 'stVal';
          }

          // trip guard information
          const tripGuardInfo = parentInputs?.querySelector(
            `ExtRef[intAddr="VB${(addressNumber + 40)
              .toString(10)
              .padStart(3, '0')}|q=0x1FFF"]`
          );
          if (tripGuardInfo) {
            hasTripGuardInformation =
              tripGuardInfo.getAttribute('iedName') === selectedIedName &&
              tripGuardInfo.getAttribute('serviceType') === 'GOOSE' &&
              tripGuardInfo.getAttribute('srcLDInst') === 'CFG' &&
              tripGuardInfo.getAttribute('srcLNClass') === 'LLN0' &&
              tripGuardInfo.getAttribute('srcCBName') === srcCBName &&
              tripGuardInfo.getAttribute('ldInst') === 'ANN' &&
              tripGuardInfo.getAttribute('prefix') === 'SVT' &&
              tripGuardInfo.getAttribute('lnClass') === 'GGIO' &&
              tripGuardInfo.getAttribute('lnInst') === '4' &&
              (tripGuardInfo.getAttribute('doName') === 'Ind22' ||
                tripGuardInfo.getAttribute('doName') === 'Ind25') &&
              tripGuardInfo.getAttribute('daName') === 'stVal';
          }

          // inverted trip guard information
          const invertedTripGuardInfo = parentInputs?.querySelector(
            `ExtRef[intAddr="VB${(addressNumber + 60)
              .toString(10)
              .padStart(3, '0')}|q=0x1FFF"]`
          );
          if (invertedTripGuardInfo) {
            hasInvertedTripGuardInformation =
              invertedTripGuardInfo.getAttribute('iedName') ===
                selectedIedName &&
              invertedTripGuardInfo.getAttribute('serviceType') === 'GOOSE' &&
              invertedTripGuardInfo.getAttribute('srcLDInst') === 'CFG' &&
              invertedTripGuardInfo.getAttribute('srcLNClass') === 'LLN0' &&
              invertedTripGuardInfo.getAttribute('srcCBName') === srcCBName &&
              invertedTripGuardInfo.getAttribute('ldInst') === 'ANN' &&
              invertedTripGuardInfo.getAttribute('prefix') === 'SV' &&
              invertedTripGuardInfo.getAttribute('lnClass') === 'GGIO' &&
              invertedTripGuardInfo.getAttribute('lnInst') === '3' &&
              (invertedTripGuardInfo.getAttribute('doName') === 'Ind23' ||
                invertedTripGuardInfo.getAttribute('doName') === 'Ind26') &&
              invertedTripGuardInfo.getAttribute('daName') === 'stVal';
          }

          // test
          const gooseTest = parentInputs?.querySelector(
            `ExtRef[intAddr="VB${(addressNumber + 80)
              .toString(10)
              .padStart(3, '0')}|q=0x1FFF"]`
          );
          if (gooseTest) {
            hasGooseTestInformation =
              gooseTest.getAttribute('iedName') === selectedIedName &&
              gooseTest.getAttribute('serviceType') === 'GOOSE' &&
              gooseTest.getAttribute('srcLDInst') === 'CFG' &&
              gooseTest.getAttribute('srcLNClass') === 'LLN0' &&
              gooseTest.getAttribute('srcCBName') === srcCBName &&
              gooseTest.getAttribute('ldInst') === 'ANN' &&
              gooseTest.getAttribute('prefix') === 'SVT' &&
              gooseTest.getAttribute('lnClass') === 'GGIO' &&
              gooseTest.getAttribute('lnInst') === '4' &&
              gooseTest.getAttribute('doName') === 'Ind02' &&
              gooseTest.getAttribute('daName') === 'stVal';
          }

          // reset
          const busReset = parentInputs?.querySelector(
            `ExtRef[intAddr="VB${(addressNumber + 100)
              .toString(10)
              .padStart(3, '0')}|q=0x1FFF"]`
          );
          if (busReset) {
            hasBusResetInformation =
              busReset.getAttribute('iedName') === selectedIedName &&
              busReset.getAttribute('serviceType') === 'GOOSE' &&
              busReset.getAttribute('srcLDInst') === 'CFG' &&
              busReset.getAttribute('srcLNClass') === 'LLN0' &&
              busReset.getAttribute('srcCBName') === srcCBName &&
              busReset.getAttribute('ldInst') === 'ANN' &&
              busReset.getAttribute('prefix') === 'SVT' &&
              busReset.getAttribute('lnClass') === 'GGIO' &&
              busReset.getAttribute('lnInst') === '4' &&
              busReset.getAttribute('doName') === 'Ind03' &&
              busReset.getAttribute('daName') === 'stVal';
          }

          if (
            hasTripInformation &&
            hasTripGuardInformation &&
            hasInvertedTripGuardInformation &&
            hasGooseTestInformation &&
            hasBusResetInformation
          ) {
            // connectionCount += 1;
            newGraphVizOutput += `\n${selectedIedName} -> ${currentIedName}`;
            const cbId = `${currentIedName}`;
            const existingValue = cbUsage.get(cbId);
            const newValue = existingValue ? existingValue + 1 : 1;
            cbUsage.set(cbId, newValue);
          } else {
            console.log(
              currentIedName,
              extRef,
              hasTripInformation,
              hasTripGuardInformation,
              hasInvertedTripGuardInformation,
              hasGooseTestInformation,
              hasBusResetInformation
            );
          }
        });
      cbUsage.forEach((count, iedName) => {
        newGraphVizOutput += `\n${iedName} [label="${iedName} - ${count}"]`;
      });
    });
    console.log(`digraph G {\n${newGraphVizOutput}\n}`);
  }

  render(): TemplateResult {
    if (!this.doc) return html``;
    return html`<mwc-dialog id="dialog" heading="${msg('Replace IEDs')}">
      <p>
        ${msg(
          'This plugin replaces IEDs with a template, transferring ExtRef elements.'
        )}
        ${msg('It assumes the data models are compatible.')}
      </p>
      <oscd-filtered-list id="replaceIeds" multi>
        ${Array.from(this.doc.querySelectorAll('IED')).map(
          ied => html`<mwc-check-list-item data-id="${identity(ied)}">
            ${ied.getAttribute('name')}</mwc-check-list-item
          >`
        )}
      </oscd-filtered-list>
      <mwc-button
        label="${msg('Close')}"
        slot="secondaryAction"
        icon="close"
        @click="${() => {
          this.dialogUI?.close();
        }}"
      ></mwc-button>
      <mwc-button
        label="${msg('Apply')}"
        slot="primaryAction"
        icon="start"
        @click="${() => {
          this.replaceIeds();
          this.dialogUI?.close();
        }}"
      ></mwc-button>
    </mwc-dialog>`;
  }

  static styles = css`
    :host {
      width: 100vw;
      height: 100vh;
    }

    #iedSelector {
      display: flex;
    }

    h1,
    h2,
    h3 {
      color: var(--mdc-theme-on-surface);
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      margin: 0px;
      line-height: 48px;
      padding-left: 0.3em;
      transition: background-color 150ms linear;
    }
  `;
}
