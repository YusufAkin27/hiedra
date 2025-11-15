package eticaret.demo.contact_us;

import eticaret.demo.common.response.ResponseMessage;

public interface ContactUsServis {
    ResponseMessage gonder(ContactUsMessage message);
    ResponseMessage verifyEmail(String verificationData);
    ResponseMessage getAllMessages();
    ResponseMessage respondToMessage(Long messageId, String response);
}