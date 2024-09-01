import { Router } from "express";
import {
  getBotConversationHistoryTable,
  getBotExecutiveSummary,
  getBotConversationTopicChart
} from "../controllers/reportController";
const router = Router();

/* {
    "data": {
      "row_length": Number(rowLength.value),
      "page": currentPage.value,
      "sort_column": 0,
      "direction": "desc",
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "search_filter": tempFilter.value.topic,
    "date_mode": Number(tempFilter.value.date)
} */

router.post('/get-bot-conversation-history-table', getBotConversationHistoryTable)


/* {
    "data": {
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "date_mode": Number(tempFilter.value.date)
  }
   */
router.post('/get-bot-executive-summary', getBotExecutiveSummary)

/* 
{
    "data": {
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "search_filter": tempFilter.value.topic,
    "date_mode": Number(tempFilter.value.date)
} 
    
*/

router.post('/get-bot-conversation-topic-chart', getBotConversationTopicChart)

export default router;