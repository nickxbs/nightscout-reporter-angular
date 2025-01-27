import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {saveAs} from 'file-saver';
import {ProgressService} from '@/_services/progress.service';
import {GLOBALS, GlobalsData} from '@/_model/globals-data';
import {UserData} from '@/_model/nightscout/user-data';
import {Utils} from '@/classes/utils';
import {UrlData} from '@/_model/nightscout/url-data';
import {DataService} from '@/_services/data.service';
import {SessionService} from '@/_services/session.service';
import {DateAdapter} from '@angular/material/core';
import {Log} from '@/_services/log.service';
import {Settings} from '@/_model/settings';
import {NightscoutService} from '@/_services/nightscout.service';
import {MatDialogRef} from '@angular/material/dialog';
import {DialogResultButton} from '@/_model/dialog-data';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  errUserInvalid: string;

  confirmIdx = 0;
  currApiUrlIdx = -1;
  showPwd = -1;
  calcDate = GlobalsData.now;
  msgCalcDayTitle = '';
  listProfileMaxCount: string[];
  @ViewChild('fileSelect')
  fileSelect: ElementRef<HTMLInputElement>;

  constructor(private dlgRef: MatDialogRef<SettingsComponent>,
              private da: DateAdapter<any>,
              public ds: DataService,
              public ps: ProgressService,
              public ss: SessionService,
              public ns: NightscoutService) {
    da.setLocale(GLOBALS.language.code);
    this.fillSelects();
  }

  get globals(): GlobalsData {
    return GLOBALS;
  }

  get msgUrlNightscout(): string {
    return $localize`Url zur Nightscout-API`;
  }

  get msgUrlHint(): string {
    return $localize`Url zur Nightscout-API (z.B. https://xxx.ns.10be.de)`;
  }

  get msgName(): string {
    return $localize`Name`;
  }

  get msgInsulin(): string {
    return $localize`Insulin`;
  }

  get msgAccessToken(): string {
    return $localize`Zugriffsschlüssel`;
  }

  get mayAddUser(): boolean {
    if (GLOBALS.userList?.length > 0) {
      return GLOBALS.userList?.[GLOBALS.userList.length - 1]?.apiUrl(null, '', {noApi: true}) == null;
    }
    return false;
  }

  get msgStartDate(): string {
    return $localize`Daten von`;
  }

  get msgEndDate(): string {
    return $localize`Daten bis`;
  }

  get msgCalcDayFirstTitle(): string {
    return $localize`Ermittle ersten Tag mit Daten`;
  }

  get msgCalcDayLastTitle(): string {
    return $localize`Ermittle letzten Tag mit Daten`;
  }

  get lblProfileMax(): string {
    return $localize`Die Profiltabelle sollte normalerweise nur Daten zu den verwendeten
  Profilen beinhalten. iOS Loop verwendet diese Tabelle aber dazu, um dort eigene Einstellungen zu speichern
  und tut dies bei einigen Benutzern exzessiv. Ab einer bestimmten Datenmenge kann die Profiltabelle über
  die API dann nicht mehr korrekt abgefragt werden. Deswegen gibt es hier die Möglichkeit, die Anzahl an
  Datensätzen einzuschränken, die aus dieser Tabelle geholt werden. Das ist so lange notwendig, wie
  iOS Loop oder andere Uploader diese Tabelle falsch befüllen.<br><br>Maximale Anzahl an Profildatensätzen:`;
  }

  fillSelects(): void {
    this.listProfileMaxCount = [GLOBALS.msgUnlimited];
    for (let i = 1; i < GLOBALS.profileMaxCounts.length; i++) {
      this.listProfileMaxCount.push(`${GLOBALS.profileMaxCounts[i]}`);
    }
  }

  msgAccessTokenHint(isVisible: boolean): string {
    return isVisible
      ? $localize`:@@msgAccessTokenHint:Der Zugriffsschlüssel wird nur benötigt, wenn der Zugriff in Nightscout über AUTH_DEFAULT_ROLES eingeschränkt wurde`
      : '';
  }

  msgStartDateHint(isVisible: boolean): string {
    return isVisible
      ? $localize`:@@msgStartDateHint:Das Datum des ersten Tages mit Daten` : '';
  }

  msgEndDateHint(isVisible: boolean): string {
    return isVisible
      ? $localize`:@@msgEndDateHint:Das Datum des letzten kompletten Tages mit Daten`
      : '';
  }

  cancelCalculation(): void {
    this.confirmIdx = 0;
  }

  msgCalculatingDay(date: Date): string {
    return $localize`:@@msgCalculatingDay:Überprüfe ${date} ...`;
  }

  async calculateFirstDay(urlData: UrlData) {
    this.confirmIdx = 3;
    let done = false;
    this.calcDate = GlobalsData.now;
    let diff = -256;
    this.msgCalcDayTitle = this.msgCalcDayFirstTitle;
    this.ps.max = 3;
    this.ps.value = 1;
    while (this.confirmIdx === 3 && !done) {
      const check = new Date(this.calcDate.getFullYear(), this.calcDate.getMonth(), this.calcDate.getDate(), 0, 0, 0, 0);
      const url = urlData.fullUrl('entries.json', `find[date][$lte]=${check.getTime()}&count=2`);
      const json = await this.ds.request(url, {asJson: true});
      try {
        if (diff < -1) {
          if (json.length < 1) {
            diff = Math.floor(-diff / 2);
          }
        } else if (diff > 1) {
          if (json.length > 0) {
            diff = Math.floor(-diff / 2);
          }
        } else {
          done = true;
          if (json.length > 0) {
            this.calcDate = Utils.addDateDays(this.calcDate, diff);
          }
        }
        this.ps.text = $localize`Prüfe ${Utils.fmtDate(this.calcDate)} ...`;
      } catch (ex) {
        done = true;
        Log.devError(ex, 'Fehler in SettingsComponent.calculateFirstDay startDatumsErmittlung');
      }

      if (!done) {
        this.calcDate = Utils.addDateDays(this.calcDate, diff);
      }
    }
    this.ps.next();
    diff = 256;
    urlData.startDate = this.calcDate;
    done = false;
    this.msgCalcDayTitle = this.msgCalcDayLastTitle;
    while (this.confirmIdx === 3 && !done) {
      const check = new Date(this.calcDate.getFullYear(), this.calcDate.getMonth(), this.calcDate.getDate(), 23, 59, 59, 999);
      const url = urlData.fullUrl('entries.json', `find[date][$gte]=${check.getTime()}&count=2`);
      const json = await this.ds.request(url, {asJson: true});
      try {
        if (diff > 1) {
          if (json.length < 1) {
            diff = Math.floor(-diff / 2);
          }
        } else if (diff < -1) {
          if (json.length > 0) {
            diff = Math.floor(-diff / 2);
          }
        } else {
          done = true;
          if (Utils.isOnOrAfter(this.calcDate, Utils.addDateDays(GlobalsData.now, -1))) {
            this.calcDate = GlobalsData.now;
          } else if (json.length < 1) {
            this.calcDate = Utils.addDateDays(this.calcDate, -diff);
          }
        }
        this.ps.text = $localize`Prüfe ${Utils.fmtDate(this.calcDate)} ...`;
      } catch (ex) {
        done = true;
      }

      if (!done) {
        this.calcDate = Utils.addDateDays(this.calcDate, diff);
      }
    }

    if (Utils.isOnOrAfter(this.calcDate, GlobalsData.now)) {
      urlData.endDate = null;
    } else {
      urlData.endDate = this.calcDate;
    }
    this.ps.clear();
    // urlData.startDateEditString = urlData.startDateEdit;
    // Log.info(`${Utils.fmtDate(urlData.startDate)} - ${Utils.fmtDate(urlData.endDate)} ${urlData.startDateEditString}`);
    console.log(GLOBALS.user.listApiUrl);
    this.confirmIdx = 0;
  }

  clickExport(): void {
    saveAs(new Blob([Settings.doit(GLOBALS.asSharedString)]), `nightrep-cfg.${Utils.fmtDate(new Date(), 'yyyyMMdd-hhmm')}.json`);
    // this.exportData = convert.base64Encode(convert.utf8.encode(Settings.doit(g.asSharedString)));
    //
    // Future.delayed(Duration(milliseconds: 100), () {
    //   (html.querySelector('#exportForm') as html.FormElement).submit();
    // });
  }

  clickImport() {
    this.fileSelect.nativeElement.click();
  }

  fileSelected(fileInput: any) {
    if (fileInput?.target?.files?.length > 0) {
      const reader = new FileReader();
      const file = fileInput.target.files[0];
      reader.addEventListener('load', (event: any) => {
        let content = event.target.result;
        const pos = content.indexOf(',');
        if (pos >= 0) {
          content = content.substring(pos + 1);
        }
        content = Utils.decodeBase64(content);
        this.ds.fromSharedString(Settings.tiod(content));
        this.ds._initAfterLoad();
        this.fileSelect.nativeElement.value = null;
      });
      reader.readAsDataURL(file);
    } else {
      console.error(fileInput);
      Log.error(fileInput);
    }
  }

  /*
  @Output('settingsresult')
  Stream<html.UIEvent> get trigger => _trigger.stream;
  final _trigger = StreamController<html.UIEvent>.broadcast(sync: true);

  SettingsComponent();

  String progressText;

  void confirmOk() {
    switch (confirmIdx) {
      case 1:
        try {
          g.userList.removeAt(g.userIdx);
          g.isConfigured &= g.userList.isNotEmpty;
          if (!g.isConfigured) {
            g.saveWebData();
            fire('ok');
          }
          // ignore: empty_catches
        } catch (e) {}
        break;
      case 2:
        try {
          g.user.listApiUrl.removeAt(currApiUrlIdx);
          // ignore: empty_catches
        } catch (e) {}
        break;
    }
    confirmIdx = 0;
  }

  void removeUrl(int idx) {}

  String exportData = '';

  String get msgExport => Intl.message('Bitte den Dateinamen für die Speicherung auswählen');

  void fire(String type) {
    switch (type) {
      case 'check':
        checkUser('ok');
        return;
      case 'cancel':
        break;
    }
    _trigger.add(html.UIEvent(type, detail: 0));
    errUserInvalid = null;
  }
  */
  navigate(url: string): void {
    window.open(url, '_blank');
  }

  ngOnInit(): void {
  }

  msgCheckUser(url: string): string {
    return $localize`:@@msgCheckUser:Überprüfe Zugriff auf ${url}...`;
  }

  addUser(): void {
    if (!Utils.isEmpty(GLOBALS.userList[GLOBALS.userList.length - 1].apiUrl(null, ''))) {
      GLOBALS.userList.push(new UserData());
      GLOBALS.userIdx = GLOBALS.userList.length - 1;
    }
  }

  deleteUrl(idx: number): void {
    this.ss.confirm($localize`Soll die URL ${GLOBALS.user.listApiUrl[idx].url} vom Benutzer wirklich gelöscht werden?`, 'settings').subscribe(result => {
      switch (result.btn) {
        case DialogResultButton.yes:
          GLOBALS.user.listApiUrl.splice(idx, 1);
          break;
      }
    });
    this.currApiUrlIdx = idx;
    this.confirmIdx = 2;
  }

  addUrl() {
    GLOBALS.user.listApiUrl.push(new UrlData());
  }

  async checkUser(saveData = true) {
    GLOBALS.user.listApiUrl.sort((a, b) => Utils.compareDate(a.endDate, b.endDate));
    this.ps.text = this.msgCheckUser(GLOBALS.user.apiUrl(null, '', {noApi: true}));
    const ret = await this.ss.isUserValid(GLOBALS.user);
    this.ps.text = null;
    this.errUserInvalid = ret;
    // set isConfigured to true, if url is reachable
    // never set isConfigured to false, since this
    // will trigger the welcome dialog
    if (ret != null) {
      if (saveData) {
        this.ss.confirm($localize`Die URL ist nicht erreichbar. Soll trotzdem gespeichert werden?`, 'settings').subscribe(result => {
          switch (result.btn) {
            case DialogResultButton.yes:
              this.ds.saveWebData();
              this.dlgRef.close({btn: DialogResultButton.ok});
              break;
          }
        });
      }
    }
    if (ret == null) {
      GLOBALS.isConfigured = true;
      this.ds.saveWebData();
      if (saveData) {
        this.dlgRef.close({btn: DialogResultButton.ok});
      }
    }
  }

  dateChange(item: any, setter: string, event: any) {
    item[setter] = event.value;
  }

  clickSave() {
    this.checkUser(true);
  }
}
