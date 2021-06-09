import { Type } from "class-transformer";
import { Column, Entity } from "../../../core/platform/services/database/services/orm/decorators";

const TYPE = "group_app";

@Entity(TYPE, {
  primaryKey: [["group_id"], "app_id", "id"],
  type: TYPE,
})
export class CompanyApplication {
  @Type(() => String)
  @Column("group_id", "timeuuid")
  company_id: string;

  @Type(() => String)
  @Column("app_id", "timeuuid")
  application_id: string;

  @Type(() => String)
  @Column("id", "timeuuid", { generator: "timeuuid" })
  id: string;

  @Type(() => String)
  @Column("app_company_id", "string")
  application_company_id: string;

  @Type(() => String)
  @Column("app_group_name", "string")
  application_group_name: string;

  @Column("created_at", "number")
  created_at: number;

  @Type(() => String)
  @Column("created_by", "string")
  created_by: string; //Will be the default delegated user when doing actions on Twake
}
