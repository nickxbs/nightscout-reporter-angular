import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DatepickerPeriod} from '@/_model/datepicker-period';
import {DatepickerData} from '@/controls/datepicker/datepicker-data';
import {GLOBALS, GlobalsData} from '@/_model/globals-data';
import {SessionService} from '@/_services/session.service';

@Component({
  selector: 'app-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss']
})
export class DatepickerComponent implements OnInit {
  @Input()
  firstDayOfWeek = 1;
  @Input()
  showInfo = false;
  @Input()
  showLabel = true;
  @Input()
  msgPeriod = $localize`Zeitraum`;
  @Output('save')
  trigger = new EventEmitter<UIEvent>();
  @Output()
  periodChange = new EventEmitter<DatepickerPeriod>();
  data = new DatepickerData();

  constructor(public ss: SessionService) {
  }

  get classForButton(): string[] {
    const ret = ['dpBtn'];
    if (this.data.period.isEmpty) {
      ret.push('empty');
    }
    return ret;
  }

  get periodLabelMain(): string {
    if (this.data.period == null) {
      return '';
    }
    return this.data.period.display;
  }

  get periodLabelSub(): string {
    return `(${this.data.period.dowActiveText})`;
  }

  get periodFloatingLabel(): string {
    if (this.data.period.start == null || this.data.period.end == null) {
      return '';
    }
    return this.msgPeriod;
  }

  @Input()
  set period(value: DatepickerPeriod | string) {
    const temp = value instanceof DatepickerPeriod ? value : new DatepickerPeriod(value);
    this.data.period = temp ?? this.data.period;
    if (this.data.period.entryKey != null && this.data.period.list.length > 0) {
      const entry =
        this.data.period.list.find((e) => e.key == this.data.period.entryKey);
      entry?.fill(this.data.period);
    }
    this.data.month = GlobalsData.now;
  }

  ngOnInit(): void {
  }

  infoClass(cls: string): string {
    return this.showInfo ? `${cls} infoarea showinfo` : `${cls} infoarea`;
  }

  onClick() {
    this.data.period = GLOBALS.period;
    this.data.loadedPeriod = GLOBALS.period.toString();
    this.ss.showPopup('datepickerdialog', this.data).subscribe(result => {
      switch (result.btn) {
        case 'save':
          this.periodChange.emit(this.data.period);
          break;
      }
    });
  }
}