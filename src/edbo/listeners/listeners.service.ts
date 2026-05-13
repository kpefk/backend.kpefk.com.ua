import { Injectable } from "@nestjs/common";
import { EdboService } from "../core/edbo.service";
import { ListenersListExternalParamsDto } from "./dto/listeners-list-external-params.dto";
import { ListenersListExternalResponseDto } from "./dto/listeners-list-external-response.dto";

/**
 * Сервіс для роботи з слухачами через ЄДЕБО API.
 * Інкапсулює всі HTTP-запити до `/api/listener/*`.
 *
 * @see {@link https://edbo.gov.ua} ЄДЕБО — Єдина державна база освіти
 */
@Injectable()
export class ListenersService {
    constructor(private readonly edbo: EdboService) {}

    /**
     * Перелік карток слухачів (для зовнішніх систем)
     * 
     * `POST api/listener/listExternal`
     * 
     * @param listenerId - Код слухача integer (необов'язковий)
     * @param rnokpp - РНОКПП string (необов'язковий)
     * @param universityId - Код ЗО integer (необов'язковий)
     * @param isActive - Чи активний статус навчання boolean (необов'язковий)
     * @param fromDate - Дата останнього редагування картки слухача date (необов'язковий)
     * @param pageNo - Номер сторінки результатів (починається з 0; 1000 результатів на сторінку) integer (необов'язковий, за замовчуванням 1)
     */
    async listExternal(params: ListenersListExternalParamsDto): Promise<ListenersListExternalResponseDto> {
        return this.edbo.post("/api/listener/listExternal", params);
    }
}