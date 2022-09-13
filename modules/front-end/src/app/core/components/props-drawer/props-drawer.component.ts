import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { IUserPropertyPresetValue, IUserProp, IUserTag } from "@shared/types";
import { uuidv4 } from "@utils/index";
import { EnvUserPropService } from "@services/env-user-prop.service";

@Component({
  selector: 'app-props-drawer',
  templateUrl: './props-drawer.component.html',
  styleUrls: ['./props-drawer.component.less']
})
export class PropsDrawerComponent {

  @Input() envId: number;
  @Output() close: EventEmitter<boolean> = new EventEmitter();

  constructor(
    private envUserPropService: EnvUserPropService,
    private message: NzMessageService
  ) { }

  private _visible: boolean = false;
  @Input()
  set visible(visible: boolean) {
    if (visible) {
      this.isLoading = true;
      this.envUserPropService.get().subscribe(prop => {
        this.props = prop.userProperties.filter(x => !x.isArchived);
        this.tags = prop.userTags.filter(x => !x.isArchived);
        this.tagProps = this.props.map(x => x.name);
        this.isLoading = false;
      })
    }
    this._visible = visible;
  }
  get visible() {
    return this._visible;
  }

  isLoading: boolean = false;

  sources: string[] = ["header", "querystring", "cookie", "body"];

  // props
  displayedProps: IUserProp[] = [];

  _props: IUserProp[];
  get props() {
    return this._props;
  }
  set props(props: IUserProp[]) {
    this._props = [...props];
    this.searchProp();
  }

  propsPageIndex: number = 1;

  // tags
  tags: IUserTag[] = [];
  tagProps: string[];

  newTag() {
    const newTag = {
      id: uuidv4(),
      source: 'header',
      requestProperty: '',
      userProperty: '',
      isArchived: false,

      isEditing: true,
    };

    this.tags = [...this.tags, newTag];
  }

  editTag(row: IUserTag) {
    row.isEditing = true;
  }

  saveTag(row: IUserTag) {
    row.isSaving = true;

    this.envUserPropService
      .upsertTag(row.id, row.source, row.requestProperty, row.userProperty)
      .subscribe(() => {
        row.isSaving = false;
        row.isEditing = false;

        this.message.success('添加成功');
      }, () => {
        row.isSaving = false;
        this.message.error('添加失败');
      });
  }

  deleteTag(row: IUserTag) {
    row.isDeleting = true;

    this.envUserPropService.archiveTag(row.id).subscribe(() => {
      this.tags = this.tags.filter(tags => tags.id !== row.id);
      row.isDeleting = false;
      this.message.success('删除成功');
    }, _ => {
      row.isDeleting = false;
      this.message.error('删除失败');
    });
  }

  selectTag(row: IUserTag, value: string) {
    // newly created tag
    if (value.startsWith('新建属性 ')){
      const propName = value
        .replace('新建属性 ', '')
        .replace(/'/g, '');

      const newProp: IUserProp = {
        id: uuidv4(),
        name: propName,
        presetValues: [],
        isBuiltIn: false,
        isArchived: false,
        usePresetValuesOnly: false,
        isDigestField: false,
        remark: ''
      };

      this.envUserPropService.upsertProp(newProp).subscribe(() => {
        this.message.success(`新建属性 ${propName} 成功`)
      }, _ => this.message.error(`新建属性 ${propName} 失败`));

      this.props = [...this.props, newProp];
      row.userProperty = propName;

      return;
    }

    // for existing tag
    row.userProperty = value;
  }

  searchTag(value: string) {
    this.tagProps = this.props.map(x => x.name);

    if (!value) {
      return;
    }

    if (this.tagProps.findIndex(x => x.startsWith(value)) === -1) {
      this.tagProps = [`新建属性 '${value}'`];
    }
  }

  propUsed(prop: string) {
    return prop && this.tags.findIndex(x => x.userProperty === prop) !== -1;
  }

  newProp() {
    const newProp: IUserProp = {
      id: uuidv4(),
      name: '',
      presetValues: [],
      isBuiltIn: false,
      isArchived: false,
      usePresetValuesOnly: false,
      isDigestField: false,
      remark: '',

      isNew: true,
      isEditing: true,
    };

    this.props = [...this.props, newProp];

    this.propsPageIndex = Math.floor(this.props.length / 10) + 1;
  }

  editProp(row: IUserProp) {
    row.isEditing = true;
  }

  cancelEditProp(row: IUserProp) {
    row.isEditing = false;
  }

  toggleIsDigestField(row: IUserProp) {
    if (row.isNew) {
      return;
    }

    this.envUserPropService.upsertProp(row).subscribe(() => {
      this.message.success(row.isDigestField ? `标记成功` : '取消标记成功');
    }, _ => {
      this.message.error('修改失败');
    });
  }

  saveProp(row: IUserProp, successCb?: Function) {
    if (!row.name) {
      this.message.warning('属性名称不能为空');
      return;
    }

    if (this.props.find(x => x.name === row.name && x.id !== row.id)) {
      this.message.warning(`属性 ${row.name} 已存在`);
      return;
    }

    row.isSaving = true;

    this.envUserPropService.upsertProp(row).subscribe(() => {
      row.isSaving = false;
      row.isEditing = false;

      this.message.success('保存成功');
      successCb && successCb();
    }, _ => {
      row.isSaving = false;
      this.message.error('保存失败');
    });
  }

  archiveProp(row: IUserProp) {
    if (!row.name) {
      this.props = this.props.filter(prop => prop.id !== row.id);
      return;
    }

    row.isDeleting = true;

    this.envUserPropService.archiveProp(row.id).subscribe(() => {
      this.props = this.props.filter(prop => prop.id !== row.id);
      this.message.success("删除成功");
      row.isDeleting = false;
    }, _ => {
      row.isDeleting = false;
      this.message.error('删除失败');
    });
  }

  propSearchText: string = '';
  searchProp() {
    if (!this.propSearchText) {
      this.displayedProps = this.props;
      return;
    }

    this.displayedProps = this.props.filter(x => x.name.toLowerCase().includes(this.propSearchText.toLowerCase()));
  }

  propPresetValuesModalVisible = false;
  currentUserPropRow: IUserProp;
  currentPresetValueKey = '';
  currentPresetValueDescription = '';

  private resetCurrentPreset() {
    this.currentPresetValueKey = '';
    this.currentPresetValueDescription = '';
  }

  openPropPresetValuesModal(userProp: IUserProp) {
    this.currentUserPropRow = { ...userProp };
    this.propPresetValuesModalVisible = true;
  }

  closePropPresetValuesModal() {
    this.propPresetValuesModalVisible = false;
    this.resetCurrentPreset();
  }

  addPropPresetValue() {
    this.currentUserPropRow.presetValues = [{
      id: uuidv4(),
      value: this.currentPresetValueKey,
      description: this.currentPresetValueDescription
    }, ...this.currentUserPropRow.presetValues];

    this.resetCurrentPreset();
  }

  removePropPresetValue(value: IUserPropertyPresetValue) {
    this.currentUserPropRow.presetValues = this.currentUserPropRow.presetValues.filter(p => p.id !== value.id);
  }

  savePropPresetValuesModal() {
    if (this.currentUserPropRow.presetValues.length === 0) {
      this.currentUserPropRow.usePresetValuesOnly = false;
    }

    this.saveProp(this.currentUserPropRow, () => {
      this.props = this.props.map(x => {
        if (x.id === this.currentUserPropRow.id) {
          return { ...this.currentUserPropRow };
        }
        return x;
      })
    });

    this.propPresetValuesModalVisible = false;
    this.resetCurrentPreset();
  }
}