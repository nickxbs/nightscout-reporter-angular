import {Component} from '@angular/core';
import {GLOBALS, GlobalsData} from '@/_model/globals-data';
import {SessionService} from '@/_services/session.service';

@Component({
  selector: 'app-view-users',
  templateUrl: './view-users.component.html',
  styleUrls: ['./view-users.component.scss']
})
export class ViewUsersComponent {

  constructor(public ss: SessionService) {

  }

  get globals(): GlobalsData {
    return GLOBALS;
  }

  tileClicked($event: MouseEvent, idx: number) {
    if (idx === GLOBALS.userIdx) {
      GLOBALS.viewType = 'tile';
    } else {
      this.ss.activateUser(idx)
    }
  }

  tileClass(idx: number) {
    const ret = ['tile'];
    if (idx === GLOBALS.userIdx) {
      ret.push('tilechecked');
    }
    return ret;
  }

  clickDelete(evt: MouseEvent) {
    evt.stopPropagation();
    this.ss.deleteUser();
  }

  clickSettings(evt: MouseEvent) {
    evt.stopPropagation();
    this.ss.showSettings();
  }
}
